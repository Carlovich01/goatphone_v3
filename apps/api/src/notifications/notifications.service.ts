import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  Order,
  Product,
  DELIVERY_LABELS,
  ORDER_STATUS_LABELS,
  isOfferActive,
} from '@goatphone/shared';

/**
 * Sends transactional emails by POSTing a { to, subject, html } payload to an
 * n8n webhook (which relays it to a Gmail node). All HTML is built here so the
 * n8n workflow stays trivial. Failures never break the main request.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly webhookUrl: string;
  private readonly adminEmail: string;
  private readonly webUrl: string;
  private readonly logoUrl: string;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.webhookUrl = config.get<string>('N8N_WEBHOOK_URL') || '';
    this.adminEmail = config.get<string>('STORE_EMAIL') || 'info.goatphone@gmail.com';
    this.webUrl = config.get<string>('WEB_URL') || 'http://localhost:5173';
    this.logoUrl = config.get<string>('LOGO_URL') || `${this.webUrl}/logo.png`;
  }

  private fmt(n: number): string {
    return '$' + Math.round(n).toLocaleString('es-AR') + ' ARS';
  }

  /** Fire-and-forget POST to the n8n webhook. Never throws. */
  private async post(event: string, to: string, subject: string, html: string): Promise<void> {
    if (!to) return;
    if (!this.webhookUrl) {
      this.logger.warn(`N8N_WEBHOOK_URL no configurado; email "${event}" a ${to} omitido`);
      return;
    }
    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, to, subject, html }),
      });
      if (!res.ok) this.logger.error(`n8n respondió ${res.status} para "${event}" (${to})`);
    } catch (e) {
      this.logger.error(`Error enviando email "${event}": ${e}`);
    }
  }

  // ---------------- HTML building ----------------

  private shell(bodyHtml: string): string {
    return `
<div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0f172a;padding:20px 24px;text-align:center;">
      <img src="${this.logoUrl}" alt="GOATPHONE" height="40" style="height:40px;display:inline-block;" />
    </div>
    <div style="padding:28px 24px;color:#0f172a;font-size:15px;line-height:1.55;">
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;">
      GOATPHONE · Este es un correo automático, por favor no respondas a esta dirección.
    </div>
  </div>
</div>`.trim();
  }

  private button(href: string, label: string): string {
    return `<a href="${href}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;">${label}</a>`;
  }

  private itemsTable(order: Order): string {
    const rows = order.items
      .map(
        (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">${i.quantity}× ${i.brand} ${i.model}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;">${this.fmt(
          i.unitPriceArs * i.quantity,
        )}</td>
      </tr>`,
      )
      .join('');
    return `
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rows}
        <tr>
          <td style="padding:10px 0;font-weight:bold;">Total</td>
          <td style="padding:10px 0;font-weight:bold;text-align:right;">${this.fmt(order.totalArs)}</td>
        </tr>
      </table>`;
  }

  private orderBox(order: Order): string {
    return `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 8px;font-weight:bold;">Orden #${order.id}</p>
        ${this.itemsTable(order)}
        <p style="margin:12px 0 0;font-size:13px;color:#475569;">
          Entrega: <b>${DELIVERY_LABELS[order.deliveryMethod]}</b>
          ${order.address ? `<br/>Dirección: ${order.address}` : ''}
        </p>
      </div>`;
  }

  // ---------------- Public notifications ----------------

  /** New purchase: confirmation to the client + notice to the store. */
  async orderCreated(order: Order): Promise<void> {
    if (order.customerEmail) {
      const html = this.shell(`
        <h2 style="margin:0 0 12px;">¡Gracias por tu compra${order.customerName ? `, ${order.customerName}` : ''}!</h2>
        <p style="margin:0 0 4px;">Generamos tu orden correctamente. Acá está el detalle:</p>
        ${this.orderBox(order)}
        <p style="margin:0 0 18px;">Te avisaremos por este medio cada vez que cambie el estado de tu pedido.</p>
        ${this.button(`${this.webUrl}/orders`, 'Ver mis compras')}
      `);
      await this.post('order_created_client', order.customerEmail, `Tu orden #${order.id} en GOATPHONE`, html);
    }

    const adminHtml = this.shell(`
      <h2 style="margin:0 0 12px;">🛒 Nueva compra</h2>
      <p style="margin:0 0 4px;">Se generó una nueva orden en el sistema.</p>
      ${this.orderBox(order)}
      <p style="margin:0;font-size:13px;color:#475569;">
        Cliente: <b>${order.customerName ?? '—'}</b> (${order.customerEmail ?? '—'})<br/>
        DNI: ${order.dni ?? '—'} · Tel: ${order.phone ?? '—'}
      </p>
    `);
    await this.post('order_created_admin', this.adminEmail, `Nueva compra: orden #${order.id}`, adminHtml);
  }

  /** Fulfillment status changed (paid → … → delivered): notify the client. */
  async statusChanged(order: Order): Promise<void> {
    if (!order.customerEmail) return;
    const label = ORDER_STATUS_LABELS[order.status] ?? order.status;
    const html = this.shell(`
      <h2 style="margin:0 0 12px;">Tu pedido se actualizó</h2>
      <p style="margin:0 0 12px;">El estado de tu <b>orden #${order.id}</b> ahora es:</p>
      <p style="margin:0 0 18px;text-align:center;">
        <span style="display:inline-block;background:#ede9fe;color:#6d28d9;font-weight:bold;padding:10px 18px;border-radius:999px;">${label}</span>
      </p>
      ${this.button(`${this.webUrl}/orders`, 'Seguir mi pedido')}
    `);
    await this.post('order_status_client', order.customerEmail, `Tu orden #${order.id}: ${label}`, html);
  }

  /** Client opened a warranty claim: notify the store. */
  async warrantyClaimed(order: Order): Promise<void> {
    const html = this.shell(`
      <h2 style="margin:0 0 12px;">🛡️ Nuevo reclamo de garantía</h2>
      <p style="margin:0 0 8px;">El cliente <b>${order.customerName ?? '—'}</b> (${order.customerEmail ?? '—'}) inició un reclamo de garantía sobre la <b>orden #${order.id}</b>.</p>
      ${
        order.warrantyClaim
          ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;margin:8px 0;color:#9a3412;"><b>Descripción:</b><br/>${order.warrantyClaim}</div>`
          : ''
      }
      <p style="margin:8px 0 0;font-size:13px;color:#475569;">Tel: ${order.phone ?? '—'} · DNI: ${order.dni ?? '—'}</p>
    `);
    await this.post('warranty_claim_admin', this.adminEmail, `Reclamo de garantía — orden #${order.id}`, html);
  }

  /** Admin resolved a warranty claim: notify the client. */
  async warrantyResolved(order: Order, accepted: boolean): Promise<void> {
    if (!order.customerEmail) return;
    const html = this.shell(`
      <h2 style="margin:0 0 12px;">Resolución de tu garantía</h2>
      <p style="margin:0 0 14px;">Tu reclamo de garantía sobre la <b>orden #${order.id}</b> fue:</p>
      <p style="margin:0 0 18px;text-align:center;">
        <span style="display:inline-block;background:${accepted ? '#dcfce7' : '#fee2e2'};color:${accepted ? '#166534' : '#991b1b'};font-weight:bold;padding:10px 18px;border-radius:999px;">${
          accepted ? 'Garantía aceptada' : 'Garantía rechazada'
        }</span>
      </p>
      <p style="margin:0 0 18px;">Recordá que las garantías se gestionan en nuestro <b>local físico</b>. Acercate con tu comprobante.</p>
      ${this.button(`${this.webUrl}/orders`, 'Ver mis compras')}
    `);
    await this.post(
      'warranty_resolved_client',
      order.customerEmail,
      `Garantía ${accepted ? 'aceptada' : 'rechazada'} — orden #${order.id}`,
      html,
    );
  }

  /** New offer created: broadcast to every client. */
  async offerCreated(product: Product): Promise<void> {
    if (!isOfferActive(product)) return;
    const clients = await this.prisma.user.findMany({
      where: { role: 'client' },
      select: { email: true, name: true },
    });
    if (!clients.length) return;

    const until = product.offerEndsAt
      ? new Date(product.offerEndsAt).toLocaleDateString('es-AR')
      : '';
    const card = `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;text-align:center;">
        ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.brand} ${product.model}" style="max-height:140px;margin:0 auto 12px;display:block;" />` : ''}
        <p style="margin:0;font-weight:bold;font-size:17px;">${product.brand} ${product.model}</p>
        <p style="margin:8px 0 0;">
          <span style="color:#94a3b8;text-decoration:line-through;">${this.fmt(product.priceArs)}</span>
          &nbsp;<span style="color:#16a34a;font-weight:bold;font-size:20px;">${this.fmt(product.offerPriceArs as number)}</span>
        </p>
        ${until ? `<p style="margin:6px 0 0;color:#16a34a;font-size:13px;font-weight:bold;">Oferta válida hasta el ${until}</p>` : ''}
      </div>`;

    const subject = `🔥 Oferta en ${product.brand} ${product.model}`;
    for (const c of clients) {
      const html = this.shell(`
        <h2 style="margin:0 0 12px;">¡Oferta por tiempo limitado!</h2>
        <p style="margin:0 0 4px;">Hola${c.name ? ` ${c.name}` : ''}, tenemos una nueva oferta para vos:</p>
        ${card}
        ${this.button(`${this.webUrl}/product/${product.id}`, 'Ver en la tienda')}
      `);
      await this.post('offer_created_client', c.email, subject, html);
    }
  }
}
