import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Order } from '@goatphone/shared';

export interface CartItemInput {
  productId: number;
  quantity: number;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private mapOrder(o: any): Order {
    return {
      id: o.id,
      status: o.status,
      totalArs: o.totalArs,
      mpPreferenceId: o.mpPreferenceId ?? null,
      initPoint: o.initPoint ?? null,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
      items: (o.items ?? []).map((i: any) => ({
        productId: i.productId,
        brand: i.brand,
        model: i.model,
        quantity: i.quantity,
        unitPriceArs: i.unitPriceArs,
      })),
    };
  }

  async createPending(userId: number, items: CartItemInput[]): Promise<Order> {
    if (!items?.length) throw new BadRequestException('El carrito esta vacio');
    const ids = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let total = 0;
    const orderItems = items.map((i) => {
      const p = byId.get(i.productId);
      if (!p) throw new BadRequestException(`Producto ${i.productId} no disponible`);
      const qty = Math.max(1, Math.floor(i.quantity));
      if (p.stock < qty) throw new BadRequestException(`Stock insuficiente para ${p.brand} ${p.model}`);
      total += p.priceArs * qty;
      return {
        productId: p.id,
        brand: p.brand,
        model: p.model,
        quantity: qty,
        unitPriceArs: p.priceArs,
      };
    });

    const order = await this.prisma.order.create({
      data: {
        userId,
        status: 'pending',
        totalArs: total,
        items: { create: orderItems },
      },
      include: { items: true },
    });
    return this.mapOrder(order);
  }

  async attachPreference(orderId: number, preferenceId: string, initPoint: string) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { mpPreferenceId: preferenceId, initPoint },
    });
  }

  /** Marks an order paid and decrements stock (idempotent). */
  async markPaid(orderId: number, paymentId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order || order.status === 'paid') return; // idempotent
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'paid', mpPaymentId: paymentId },
      });
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    });
  }

  async markFailed(orderId: number, paymentId?: string): Promise<void> {
    await this.prisma.order.updateMany({
      where: { id: orderId, status: 'pending' },
      data: { status: 'failed', mpPaymentId: paymentId },
    });
  }

  async forUser(userId: number): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { id: 'desc' },
    });
    return orders.map((o) => this.mapOrder(o));
  }

  async one(orderId: number, userId: number): Promise<Order> {
    const o = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!o) throw new NotFoundException('Orden no encontrada');
    return this.mapOrder(o);
  }

  async all(): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      include: { items: true },
      orderBy: { id: 'desc' },
    });
    return orders.map((o) => this.mapOrder(o));
  }
}
