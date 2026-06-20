import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { EmbeddingService } from './embedding.service';
import { ComparisonService } from '../comparison/comparison.service';
import { toPhoneSpecs } from '../common/spec-mapper';
import { AiSummary, ChatMessage, Product } from '@goatphone/shared';

interface CacheEntry {
  value: AiSummary;
  expires: number;
}

@Injectable()
export class AiService {
  private summaryCache = new Map<string, CacheEntry>();
  private rate = new Map<number, number[]>();
  private readonly topK: number;
  private readonly RATE_LIMIT = 20; // requests / minute / user

  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
    private embeddings: EmbeddingService,
    private comparison: ComparisonService,
    config: ConfigService,
  ) {
    this.topK = Number(config.get('AI_RAG_TOP_K')) || 6;
  }

  private checkRate(userId: number) {
    const now = Date.now();
    const arr = (this.rate.get(userId) ?? []).filter((t) => now - t < 60_000);
    if (arr.length >= this.RATE_LIMIT) {
      throw new HttpException('Demasiadas consultas a la IA, espera un momento.', HttpStatus.TOO_MANY_REQUESTS);
    }
    arr.push(now);
    this.rate.set(userId, arr);
  }

  private compactLine(p: Product, score?: number): string {
    const s = p.specs;
    return (
      `#${p.id} ${p.brand} ${p.model} | $${p.priceArs} ARS | stock ${p.stock} | ` +
      `RAM ${s.ram ?? '?'}GB, ${s.storage ?? '?'}GB, bat ${s.batteryCapacity ?? '?'}mAh, ` +
      `${s.displaySize ?? '?'}" ${s.displayRefreshRate ?? '?'}Hz, cam ${s.primaryRearMp ?? '?'}MP, ` +
      `${s.has5g ? '5G' : '4G'}, ${s.processorBrand ?? ''} ${s.processorModel ?? ''}` +
      (score !== undefined ? ` | score ${score}/100` : '')
    );
  }

  // ---------------- Comparison summary + winner ----------------
  async summary(ids: number[]): Promise<AiSummary> {
    const result = await this.comparison.compare(ids);
    const scoreById = new Map(result.scores.map((s) => [s.productId, s.global]));
    const key = ids
      .slice()
      .sort((a, b) => a - b)
      .map((id) => `${id}:${result.products.find((p) => p.id === id)?.priceArs ?? 0}:${scoreById.get(id)}`)
      .join('|');

    const cached = this.summaryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return { ...cached.value, cached: true };
    }

    const winner = result.products.find((p) => p.id === result.winnerProductId)!;
    const context = result.products
      .map((p) => this.compactLine(p, scoreById.get(p.id)))
      .join('\n');
    const single = result.products.length === 1;

    const system = single
      ? 'Sos un experto en celulares de la tienda GOATPHONE. Resumi un unico equipo de forma breve, ' +
        'clara y en espanol rioplatense neutro. Destaca sus fortalezas y debilidades por categoria ' +
        '(rendimiento, camara, bateria, pantalla, valor). No lo compares con otros equipos ni hables ' +
        'de ganadores. Se objetivo y conciso.'
      : 'Sos un experto en celulares de la tienda GOATPHONE. Compara los equipos de forma breve, ' +
        'clara y en espanol rioplatense neutro. Destaca fortalezas y debilidades por categoria ' +
        '(rendimiento, camara, bateria, pantalla, valor). Se objetivo y conciso.';
    const prompt = single
      ? `Resumi este celular destacando sus puntos fuertes y debiles y para que tipo de usuario ` +
        `conviene. No lo trates como ganador ni lo compares con otros. Maximo 5 oraciones.\n\n${context}`
      : `Compara estos celulares y explica por que ${winner.brand} ${winner.model} es el ganador ` +
        `segun su puntaje. Maximo 5 oraciones.\n\n${context}`;

    const text = await this.gemini.generate(system, [{ role: 'user', text: prompt }]);

    const value: AiSummary = {
      summary:
        text ??
        (single
          ? this.fallbackDeviceSummary(winner, scoreById.get(winner.id))
          : this.fallbackSummary(result.products, scoreById, winner)),
      // A single device has no rival, so there is no "winner".
      winnerProductId: single ? undefined : result.winnerProductId,
      winnerReason: single
        ? undefined
        : `${winner.brand} ${winner.model} obtuvo el mayor puntaje global (${scoreById.get(winner.id)}/100).`,
      cached: false,
    };
    this.summaryCache.set(key, { value, expires: Date.now() + 10 * 60_000 });
    return value;
  }

  private fallbackDeviceSummary(p: Product, score?: number): string {
    return (
      `${p.brand} ${p.model} obtuvo un puntaje global de ${score ?? '?'}/100 segun sus ` +
      `especificaciones y precio. (Resumen automatico: configura GEMINI_API_KEY para un analisis ` +
      `detallado por IA.)`
    );
  }

  private fallbackSummary(
    products: Product[],
    scoreById: Map<number, number>,
    winner: Product,
  ): string {
    const ranking = products
      .slice()
      .sort((a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0))
      .map((p, i) => `${i + 1}. ${p.brand} ${p.model} (${scoreById.get(p.id)}/100)`)
      .join(' ');
    return (
      `Segun el puntaje calculado sobre especificaciones y precio, el ganador es ` +
      `${winner.brand} ${winner.model}. Ranking: ${ranking}. ` +
      `(Resumen automatico: configura GEMINI_API_KEY para un analisis detallado por IA.)`
    );
  }

  // ---------------- Hybrid RAG chat ----------------
  async chat(
    userId: number,
    message: string,
    comparedIds: number[],
    history: ChatMessage[],
  ): Promise<{ reply: string }> {
    this.checkRate(userId);

    // 1) Structured retrieval: compared phones + cheapest in-stock alternatives
    const compared = await this.prisma.product.findMany({
      where: { id: { in: comparedIds } },
      include: { datasetPhone: true },
    });
    const alternatives = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 }, id: { notIn: comparedIds } },
      include: { datasetPhone: true },
      orderBy: { priceArs: 'asc' },
      take: this.topK,
    });

    // 2) Semantic retrieval over the query
    const semanticIds = await this.embeddings.semanticSearch(message, this.topK);
    const semantic = semanticIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: semanticIds }, isActive: true },
          include: { datasetPhone: true },
        })
      : [];

    // 3) Merge + dedupe, cap context
    const byId = new Map<number, any>();
    for (const p of [...compared, ...semantic, ...alternatives]) byId.set(p.id, p);
    const contextProducts = [...byId.values()].slice(0, this.topK + comparedIds.length);

    const toProduct = (p: any): Product => ({
      id: p.id,
      datasetPhoneId: p.datasetPhoneId,
      brand: p.brand,
      model: p.model,
      priceArs: p.priceArs,
      offerPriceArs: p.offerPriceArs ?? null,
      offerEndsAt: p.offerEndsAt ? new Date(p.offerEndsAt).toISOString() : null,
      stock: p.stock,
      imageUrl: p.imageUrl,
      description: p.description,
      isActive: p.isActive,
      specs: toPhoneSpecs(p.datasetPhone),
      createdAt: '',
      updatedAt: '',
    });

    const context = contextProducts.map((p) => this.compactLine(toProduct(p))).join('\n');
    const comparedNames = compared.map((p) => `${p.brand} ${p.model}`).join(', ') || 'ninguno';

    const system =
      'Sos el asistente de ventas de GOATPHONE. Responde SOLO sobre los celulares del CATALOGO ' +
      'que se te pasa como contexto. Nunca inventes modelos, precios ni stock. Si recomiendas una ' +
      'alternativa, debe estar en el contexto y tener stock > 0. Responde en espanol, breve y util. ' +
      'Si te preguntan por algo fuera del catalogo, aclaralo.';
    const prompt =
      `Celulares en comparacion: ${comparedNames}.\n\n` +
      `CATALOGO DISPONIBLE (usa solo esto):\n${context}\n\n` +
      `Pregunta del cliente: ${message}`;

    const convo: { role: 'user' | 'model'; text: string }[] = [
      ...history.slice(-4).map((m) => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
        text: m.content,
      })),
      { role: 'user', text: prompt },
    ];

    const text = await this.gemini.generate(system, convo);
    const reply =
      text ??
      this.fallbackChat(contextProducts.map(toProduct));

    // persist (best-effort)
    try {
      await this.prisma.chatMessage.createMany({
        data: [
          { userId, role: 'user', content: message },
          { userId, role: 'assistant', content: reply },
        ],
      });
    } catch {
      /* ignore history errors */
    }

    return { reply };
  }

  private fallbackChat(products: Product[]): string {
    const inStock = products.filter((p) => p.stock > 0).slice(0, 4);
    if (!inStock.length) return 'No tengo alternativas en stock para mostrarte ahora mismo.';
    const list = inStock
      .map((p) => `- ${p.brand} ${p.model}: $${p.priceArs} ARS (stock ${p.stock})`)
      .join('\n');
    return (
      `Estas son algunas opciones disponibles en stock:\n${list}\n\n` +
      `(Configura GEMINI_API_KEY para conversar con la IA.)`
    );
  }
}
