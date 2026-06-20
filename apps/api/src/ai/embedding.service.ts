import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { buildPhoneDoc, toPhoneSpecs } from '../common/spec-mapper';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private prisma: PrismaService, private gemini: GeminiService) {}

  private toVectorLiteral(values: number[]): string {
    return `[${values.join(',')}]`;
  }

  /** Generates + stores the embedding for a product (called on create/update). */
  async upsertForProduct(productId: number): Promise<void> {
    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { datasetPhone: true },
    });
    if (!p) return;
    const docText = buildPhoneDoc(
      p.brand,
      p.model,
      p.priceArs,
      p.stock,
      toPhoneSpecs(p.datasetPhone),
    );
    const vec = await this.gemini.embed(docText);

    if (!vec) {
      // AI disabled: still store the doc text (used as fallback context), no vector.
      await this.prisma.$executeRaw`
        INSERT INTO product_embeddings ("productId", "docText", embedding)
        VALUES (${productId}, ${docText}, NULL)
        ON CONFLICT ("productId") DO UPDATE SET "docText" = EXCLUDED."docText"`;
      return;
    }

    const literal = this.toVectorLiteral(vec);
    await this.prisma.$executeRaw`
      INSERT INTO product_embeddings ("productId", "docText", embedding)
      VALUES (${productId}, ${docText}, ${literal}::vector)
      ON CONFLICT ("productId") DO UPDATE
        SET "docText" = EXCLUDED."docText", embedding = EXCLUDED.embedding`;
  }

  async remove(productId: number): Promise<void> {
    await this.prisma.productEmbedding.deleteMany({ where: { productId } });
  }

  /** Semantic top-K product ids for a query. Falls back to [] if AI disabled. */
  async semanticSearch(query: string, k: number): Promise<number[]> {
    const vec = await this.gemini.embed(query);
    if (!vec) return [];
    const literal = this.toVectorLiteral(vec);
    const rows = await this.prisma.$queryRaw<{ productId: number }[]>(Prisma.sql`
      SELECT pe."productId"
      FROM product_embeddings pe
      JOIN products p ON p.id = pe."productId"
      WHERE pe.embedding IS NOT NULL AND p."isActive" = true
      ORDER BY pe.embedding <=> ${literal}::vector
      LIMIT ${k}`);
    return rows.map((r) => r.productId);
  }

  /** (Re)embeds every active product. Useful after enabling the API key. */
  async reindexAll(): Promise<number> {
    const products = await this.prisma.product.findMany({ select: { id: true } });
    for (const p of products) {
      await this.upsertForProduct(p.id);
    }
    return products.length;
  }
}
