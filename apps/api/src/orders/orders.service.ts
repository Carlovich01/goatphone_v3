import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DeliveryMethod,
  Order,
  OrderStatus,
  WARRANTY_DAYS,
  canClaimWarranty,
  effectivePrice,
} from '@goatphone/shared';

export interface CartItemInput {
  productId: number;
  quantity: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private mapOrder(o: any): Order {
    return {
      id: o.id,
      status: o.status,
      totalArs: o.totalArs,
      deliveryMethod: o.deliveryMethod,
      warrantyUntil: o.warrantyUntil
        ? o.warrantyUntil instanceof Date
          ? o.warrantyUntil.toISOString()
          : o.warrantyUntil
        : null,
      warrantyClaim: o.warrantyClaim ?? null,
      customerName: o.user?.name ?? null,
      customerEmail: o.user?.email ?? null,
      dni: o.dni ?? null,
      phone: o.phone ?? null,
      address: o.address ?? null,
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

  async createPending(
    userId: number,
    items: CartItemInput[],
    deliveryMethod: DeliveryMethod,
  ): Promise<Order> {
    if (!items?.length) throw new BadRequestException('El carrito esta vacio');

    // The buyer must have completed the data required for the chosen method.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const dni = user?.dni?.trim();
    const phone = user?.phone?.trim();
    const address = user?.address?.trim();
    if (!dni) {
      throw new BadRequestException('Antes de pagar completá tu DNI en "Mi cuenta".');
    }
    if (!phone) {
      throw new BadRequestException('Antes de pagar completá tu teléfono en "Mi cuenta".');
    }
    if (deliveryMethod === 'shipping' && !address) {
      throw new BadRequestException(
        'Para envío a domicilio completá tu dirección en "Mi cuenta".',
      );
    }

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
      // charge the offer price when there is an active temporary offer
      const unit = effectivePrice({
        priceArs: p.priceArs,
        offerPriceArs: p.offerPriceArs ?? null,
        offerEndsAt: p.offerEndsAt ? p.offerEndsAt.toISOString() : null,
      });
      total += unit * qty;
      return {
        productId: p.id,
        brand: p.brand,
        model: p.model,
        quantity: qty,
        unitPriceArs: unit,
      };
    });

    const order = await this.prisma.order.create({
      data: {
        userId,
        status: 'pending',
        deliveryMethod,
        dni,
        phone,
        address: deliveryMethod === 'shipping' ? address : null,
        totalArs: total,
        items: { create: orderItems },
      },
      include: { items: true, user: true },
    });
    const mapped = this.mapOrder(order);
    void this.notifications.orderCreated(mapped);
    return mapped;
  }

  /** Admin: advance/set the fulfillment status of an order. */
  async updateStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const allowed: OrderStatus[] = [
      'paid',
      'ready_pickup',
      'preparing',
      'shipped',
      'delivered',
      'warranty_accepted',
      'warranty_rejected',
    ];
    if (!allowed.includes(status)) {
      throw new BadRequestException('Estado de orden inválido');
    }
    const existing = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) throw new NotFoundException('Orden no encontrada');
    if (existing.status === 'pending' || existing.status === 'failed') {
      throw new BadRequestException('La orden todavía no está paga');
    }
    // warranty resolution is only valid once the client has opened a claim
    if (
      (status === 'warranty_accepted' || status === 'warranty_rejected') &&
      existing.status !== 'warranty_claimed'
    ) {
      throw new BadRequestException('No hay un reclamo de garantía para resolver');
    }

    const data: any = { status };
    // start the warranty clock when the order is marked delivered
    if (status === 'delivered' && !existing.warrantyUntil) {
      data.warrantyUntil = new Date(Date.now() + WARRANTY_DAYS * 24 * 60 * 60 * 1000);
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data,
      include: { items: true, user: true },
    });
    const mapped = this.mapOrder(order);
    if (status === 'warranty_accepted' || status === 'warranty_rejected') {
      void this.notifications.warrantyResolved(mapped, status === 'warranty_accepted');
    } else {
      void this.notifications.statusChanged(mapped);
    }
    return mapped;
  }

  /** Client: open a warranty claim (only while under warranty after delivery). */
  async claimWarranty(orderId: number, userId: number, description?: string): Promise<Order> {
    const existing = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!existing) throw new NotFoundException('Orden no encontrada');
    if (
      !canClaimWarranty({
        status: existing.status as OrderStatus,
        warrantyUntil: existing.warrantyUntil ? existing.warrantyUntil.toISOString() : null,
      })
    ) {
      throw new BadRequestException(
        'Solo podés reclamar la garantía de una compra entregada y dentro del período de garantía.',
      );
    }
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'warranty_claimed', warrantyClaim: description?.trim() || null },
      include: { items: true, user: true },
    });
    const mapped = this.mapOrder(order);
    void this.notifications.warrantyClaimed(mapped);
    return mapped;
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
      include: { items: true, user: true },
      orderBy: { id: 'desc' },
    });
    return orders.map((o) => this.mapOrder(o));
  }

  async one(orderId: number, userId: number): Promise<Order> {
    const o = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, user: true },
    });
    if (!o) throw new NotFoundException('Orden no encontrada');
    return this.mapOrder(o);
  }

  async all(): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      include: { items: true, user: true },
      orderBy: { id: 'desc' },
    });
    return orders.map((o) => this.mapOrder(o));
  }
}
