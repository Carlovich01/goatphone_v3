import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PhoneScore,
  PhoneSpecs,
  SPEC_DEFS,
  SpecCategory,
  SPEC_CATEGORIES,
  CATEGORY_WEIGHTS,
} from '@goatphone/shared';

interface NumericStat {
  min: number;
  max: number;
  p01: number;
  p99: number;
  mean: number;
  p50: number;
}

interface ScoringContext {
  numeric: Map<string, NumericStat>;
  priceMin: number;
  priceMax: number;
  loadedAt: number;
}

const CACHE_TTL_MS = 30_000;

@Injectable()
export class ScoringService {
  private ctx: ScoringContext | null = null;

  constructor(private prisma: PrismaService) {}

  async getContext(force = false): Promise<ScoringContext> {
    if (!force && this.ctx && Date.now() - this.ctx.loadedAt < CACHE_TTL_MS) {
      return this.ctx;
    }
    const stats = await this.prisma.specStat.findMany({ where: { type: 'quantitative' } });
    const numeric = new Map<string, NumericStat>();
    for (const s of stats) {
      numeric.set(s.specKey, {
        min: s.min ?? 0,
        max: s.max ?? 1,
        p01: s.p01 ?? s.min ?? 0,
        p99: s.p99 ?? s.max ?? 1,
        mean: s.mean ?? 0,
        p50: s.p50 ?? 0,
      });
    }
    const agg = await this.prisma.product.aggregate({
      where: { isActive: true },
      _min: { priceArs: true },
      _max: { priceArs: true },
    });
    this.ctx = {
      numeric,
      priceMin: agg._min.priceArs ?? 0,
      priceMax: agg._max.priceArs ?? 1,
      loadedAt: Date.now(),
    };
    return this.ctx;
  }

  invalidate() {
    this.ctx = null;
  }

  private clamp01(x: number): number {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  /** Normalizes a quantitative spec value to 0..1 using p01..p99 (whole-dataset). */
  private normNumeric(key: string, value: number | null, ctx: ScoringContext): number | null {
    if (value === null || value === undefined || !Number.isFinite(value)) return null;
    const st = ctx.numeric.get(key);
    if (!st) return null;
    const lo = st.p01;
    const hi = st.p99 > lo ? st.p99 : st.max > lo ? st.max : lo + 1;
    return this.clamp01((value - lo) / (hi - lo));
  }

  /**
   * Computes a 0-100 global score + per-category scores for a phone, normalized
   * against the whole dataset (spec_stats) plus the catalog price range for "Economía".
   */
  scorePhone(productId: number, specs: PhoneSpecs, priceArs: number, ctx: ScoringContext): PhoneScore {
    const categories = [] as { category: SpecCategory; score: number }[];

    for (const cat of SPEC_CATEGORIES) {
      const defs = SPEC_DEFS.filter(
        (d) => d.category === cat && (d.type === 'quantitative' || d.type === 'boolean'),
      );
      let weighted = 0;
      let totalW = 0;

      for (const d of defs) {
        const raw = (specs as any)[d.key];
        let norm: number | null = null;
        if (d.type === 'boolean') norm = raw ? 1 : 0;
        else norm = this.normNumeric(d.key, raw, ctx);
        if (norm === null) continue;
        weighted += norm * d.weight;
        totalW += d.weight;
      }

      // Economía: add price-efficiency term (cheaper = better) across the catalog.
      if (cat === 'Economía') {
        const range = ctx.priceMax - ctx.priceMin;
        const priceEff = range > 0 ? 1 - this.clamp01((priceArs - ctx.priceMin) / range) : 0.5;
        const priceWeight = 1.6;
        weighted += priceEff * priceWeight;
        totalW += priceWeight;
      }

      const score = totalW > 0 ? (weighted / totalW) * 100 : 0;
      categories.push({ category: cat, score: Math.round(score * 10) / 10 });
    }

    // Global = weighted by CATEGORY_WEIGHTS
    let g = 0;
    let gw = 0;
    for (const c of categories) {
      const w = CATEGORY_WEIGHTS[c.category] ?? 0;
      g += c.score * w;
      gw += w;
    }
    const global = gw > 0 ? Math.round((g / gw) * 10) / 10 : 0;

    return { productId, global, categories };
  }
}
