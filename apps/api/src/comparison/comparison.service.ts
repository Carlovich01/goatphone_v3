import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from './scoring.service';
import { mapProduct, toPhoneSpecs } from '../common/spec-mapper';
import {
  ComparisonResult,
  PhoneScore,
  SpecDistribution,
  ComparedPhoneMarker,
  getSpecDef,
  HistogramBucket,
  CategoryCount,
  CatalogPhoneRef,
} from '@goatphone/shared';

@Injectable()
export class ComparisonService {
  constructor(private prisma: PrismaService, private scoring: ScoringService) {}

  private async loadProducts(ids: number[]) {
    return this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: { datasetPhone: true },
    });
  }

  /** Scores a set of products (used by catalog listing + comparison). */
  async scoreMany(ids: number[]): Promise<PhoneScore[]> {
    if (ids.length === 0) return [];
    const products = await this.loadProducts(ids);
    const ctx = await this.scoring.getContext();
    return products.map((p) =>
      this.scoring.scorePhone(p.id, toPhoneSpecs(p.datasetPhone), p.priceArs, ctx),
    );
  }

  async compare(ids: number[]): Promise<ComparisonResult> {
    if (!ids.length) throw new BadRequestException('Selecciona al menos un celular');
    const products = await this.loadProducts(ids);
    if (!products.length) throw new BadRequestException('No se encontraron los celulares');
    const ctx = await this.scoring.getContext();
    const scores = products.map((p) =>
      this.scoring.scorePhone(p.id, toPhoneSpecs(p.datasetPhone), p.priceArs, ctx),
    );
    const winner = scores.reduce((a, b) => (b.global > a.global ? b : a), scores[0]);
    return {
      products: products.map(mapProduct),
      scores,
      winnerProductId: winner.productId,
    };
  }

  private phoneRef(p: any, specKey: string, type: string): CatalogPhoneRef {
    const raw = (p.datasetPhone as any)[specKey];
    return {
      id: p.id,
      brand: p.brand,
      model: p.model,
      imageUrl: p.imageUrl ?? null,
      priceArs: p.priceArs,
      value: type === 'boolean' ? !!raw : (raw ?? null),
    };
  }

  /**
   * Distribution of a spec across the ACTIVE CATALOG (the phones the admin
   * curated), with markers for the compared phones and, per bucket/category,
   * the list of catalog phones that fall in it (for the hover strip).
   */
  async specDistribution(specKey: string, ids: number[]): Promise<SpecDistribution> {
    const def = getSpecDef(specKey);
    if (!def) throw new BadRequestException(`Spec desconocida: ${specKey}`);
    const label = def.label;
    const unit = def.unit;

    // population = all active catalog products
    const catalog = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { datasetPhone: true },
    });
    const compared = catalog.filter((p) => ids.includes(p.id));
    const total = catalog.length;

    if (def.type === 'quantitative') {
      const withVal = catalog
        .map((p) => ({ p, v: (p.datasetPhone as any)[specKey] as number | null }))
        .filter((x): x is { p: any; v: number } => typeof x.v === 'number' && Number.isFinite(x.v));

      const values = withVal.map((x) => x.v);
      const n = values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const min = n ? sorted[0] : 0;
      const max = n ? sorted[n - 1] : 0;
      const mean = n ? values.reduce((s, v) => s + v, 0) / n : 0;
      const median = n ? sorted[Math.floor((n - 1) / 2)] : 0;
      const round = (x: number) => Math.round(x * 100) / 100;
      const fmt = (x: number) => (Number.isInteger(x) ? String(x) : String(round(x)));

      let histogram: HistogramBucket[];

      if (def.chart === 'bar') {
        // discrete: one bar per distinct value (e.g. 64 / 128 / 256 / 512 GB)
        const distinct = [...new Set(values)].sort((a, b) => a - b);
        const byValue = new Map<number, CatalogPhoneRef[]>();
        for (const { p, v } of withVal) {
          if (!byValue.has(v)) byValue.set(v, []);
          byValue.get(v)!.push(this.phoneRef(p, specKey, 'quantitative'));
        }
        histogram = distinct.map((v) => ({
          rangeStart: v,
          rangeEnd: v,
          count: byValue.get(v)!.length,
          label: fmt(v),
          phones: byValue.get(v)!,
        }));
      } else {
        // continuous: bucketed histogram (sqrt rule)
        const nBuckets = Math.min(12, Math.max(1, Math.round(Math.sqrt(n))));
        const span = max - min;
        const width = span > 0 ? span / nBuckets : 1;
        histogram = Array.from({ length: span > 0 ? nBuckets : 1 }, (_, b) => ({
          rangeStart: round(min + b * width),
          rangeEnd: round(min + (b + 1) * width),
          count: 0,
          label: span > 0 ? `${fmt(min + b * width)}-${fmt(min + (b + 1) * width)}` : `${fmt(min)}`,
          phones: [] as CatalogPhoneRef[],
        }));
        for (const { p, v } of withVal) {
          let b = span > 0 ? Math.floor((v - min) / width) : 0;
          if (b < 0) b = 0;
          if (b >= histogram.length) b = histogram.length - 1;
          histogram[b].count++;
          histogram[b].phones!.push(this.phoneRef(p, specKey, 'quantitative'));
        }
      }

      const markers: ComparedPhoneMarker[] = compared.map((p) => {
        const value = (p.datasetPhone as any)[specKey] as number | null;
        let percentile: number | undefined;
        if (value !== null && value !== undefined && n > 0) {
          const below = values.filter((v) => v <= value).length;
          percentile = Math.round((below / n) * 100);
        }
        return { productId: p.id, label: `${p.brand} ${p.model}`, value, percentile };
      });

      return {
        specKey,
        label,
        type: 'quantitative',
        unit,
        total,
        histogram,
        mean,
        median,
        min,
        max,
        higherIsBetter: def.higherIsBetter ?? true,
        markers,
      };
    }

    // categorical / boolean -> counts over the catalog
    const groups = new Map<string, CatalogPhoneRef[]>();
    for (const p of catalog) {
      const raw = (p.datasetPhone as any)[specKey];
      const key =
        def.type === 'boolean' ? (raw ? 'Si' : 'No') : ((raw ?? 'Desconocido') as string);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(this.phoneRef(p, specKey, def.type));
    }
    const categories: CategoryCount[] = [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([category, phones]) => ({ category, count: phones.length, phones }));

    const markers: ComparedPhoneMarker[] = compared.map((p) => {
      const v = (p.datasetPhone as any)[specKey];
      return {
        productId: p.id,
        label: `${p.brand} ${p.model}`,
        value: def.type === 'boolean' ? !!v : (v ?? 'Desconocido'),
      };
    });

    return {
      specKey,
      label,
      type: def.type as 'categorical' | 'boolean',
      unit,
      total,
      categories,
      markers,
    };
  }
}
