import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../ai/embedding.service';
import { ComparisonService } from '../comparison/comparison.service';
import { ScoringService } from '../comparison/scoring.service';
import { NotificationsService } from '../notifications/notifications.service';
import { mapProduct } from '../common/spec-mapper';
import { CreateProductDto, UpdateProductDto } from './dto';
import { Product, ProductSummary, effectivePrice } from '@goatphone/shared';

export interface ListFilters {
  q?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  only5g?: boolean;
  sort?: 'score' | 'priceAsc' | 'priceDesc' | 'newest';
}

@Injectable()
export class CatalogService {
  constructor(
    private prisma: PrismaService,
    private embeddings: EmbeddingService,
    private comparison: ComparisonService,
    private scoring: ScoringService,
    private notifications: NotificationsService,
  ) {}

  async list(filters: ListFilters): Promise<ProductSummary[]> {
    const where: any = { isActive: true };
    if (filters.brand) where.brand = { equals: filters.brand, mode: 'insensitive' };
    if (filters.q) {
      where.OR = [
        { brand: { contains: filters.q, mode: 'insensitive' } },
        { model: { contains: filters.q, mode: 'insensitive' } },
      ];
    }
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.priceArs = {};
      if (filters.priceMin !== undefined) where.priceArs.gte = filters.priceMin;
      if (filters.priceMax !== undefined) where.priceArs.lte = filters.priceMax;
    }
    if (filters.only5g) where.datasetPhone = { has5g: true };

    const products = await this.prisma.product.findMany({
      where,
      include: { datasetPhone: true },
    });

    const scores = await this.comparison.scoreMany(products.map((p) => p.id));
    const scoreById = new Map(scores.map((s) => [s.productId, s.global]));

    let summaries: ProductSummary[] = products.map((p) => ({
      id: p.id,
      brand: p.brand,
      model: p.model,
      priceArs: p.priceArs,
      offerPriceArs: p.offerPriceArs ?? null,
      offerEndsAt: p.offerEndsAt ? p.offerEndsAt.toISOString() : null,
      stock: p.stock,
      imageUrl: p.imageUrl ?? null,
      score: scoreById.get(p.id) ?? 0,
      ram: p.datasetPhone?.ram ?? null,
      storage: p.datasetPhone?.storage ?? null,
    }));

    // sorting by price uses the effective (offer-aware) price
    const eff = (s: ProductSummary) => effectivePrice(s);
    switch (filters.sort) {
      case 'priceAsc':
        summaries.sort((a, b) => eff(a) - eff(b));
        break;
      case 'priceDesc':
        summaries.sort((a, b) => eff(b) - eff(a));
        break;
      case 'newest':
        summaries.sort((a, b) => b.id - a.id);
        break;
      default:
        summaries.sort((a, b) => b.score - a.score);
    }
    return summaries;
  }

  async brands(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { isActive: true },
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand);
  }

  async getOne(id: number): Promise<Product> {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { datasetPhone: true },
    });
    if (!p) throw new NotFoundException('Celular no encontrado');
    return mapProduct(p);
  }

  /** Admin view: all products (active and inactive). */
  async listAll(): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      include: { datasetPhone: true },
      orderBy: { id: 'desc' },
    });
    return products.map(mapProduct);
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const ds = await this.prisma.datasetPhone.findUnique({ where: { id: dto.datasetPhoneId } });
    if (!ds) throw new BadRequestException('El celular del dataset no existe');
    const created = await this.prisma.product.create({
      data: {
        datasetPhoneId: dto.datasetPhoneId,
        brand: ds.brand,
        model: ds.model,
        priceArs: dto.priceArs,
        stock: dto.stock,
        imageUrl: dto.imageUrl,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { datasetPhone: true },
    });
    await this.embeddings.upsertForProduct(created.id);
    this.scoring.invalidate();
    return mapProduct(created);
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Celular no encontrado');
    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: { datasetPhone: true },
    });
    // price/stock affect the embedding doc
    await this.embeddings.upsertForProduct(id);
    this.scoring.invalidate();
    return mapProduct(updated);
  }

  /** Admin: set a temporary offer (sale price + expiry date) on a product. */
  async setOffer(id: number, offerPriceArs: number, offerEndsAt: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Celular no encontrado');
    if (offerPriceArs <= 0 || offerPriceArs >= product.priceArs) {
      throw new BadRequestException('El precio de oferta debe ser menor al precio normal.');
    }
    const ends = new Date(offerEndsAt);
    if (Number.isNaN(ends.getTime()) || ends.getTime() <= Date.now()) {
      throw new BadRequestException('La fecha de fin de la oferta debe ser futura.');
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: { offerPriceArs, offerEndsAt: ends },
      include: { datasetPhone: true },
    });
    this.scoring.invalidate();
    const mapped = mapProduct(updated);
    void this.notifications.offerCreated(mapped);
    return mapped;
  }

  /** Admin: remove the temporary offer from a product. */
  async clearOffer(id: number): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Celular no encontrado');
    const updated = await this.prisma.product.update({
      where: { id },
      data: { offerPriceArs: null, offerEndsAt: null },
      include: { datasetPhone: true },
    });
    this.scoring.invalidate();
    return mapProduct(updated);
  }

  async remove(id: number): Promise<{ deleted: boolean; softDeleted?: boolean }> {
    const orderItems = await this.prisma.orderItem.count({ where: { productId: id } });
    if (orderItems > 0) {
      // keep referential integrity for order history -> soft delete
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
      this.scoring.invalidate();
      return { deleted: true, softDeleted: true };
    }
    await this.embeddings.remove(id);
    await this.prisma.product.delete({ where: { id } });
    this.scoring.invalidate();
    return { deleted: true };
  }
}
