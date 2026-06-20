import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { DeliveryMethod } from '@goatphone/shared';
import { OrdersService, CartItemInput } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly accessToken: string;
  private readonly currency: string;
  private readonly webUrl: string;
  private readonly notificationUrl: string;

  constructor(private orders: OrdersService, private config: ConfigService) {
    this.accessToken = config.get<string>('MP_ACCESS_TOKEN') || '';
    this.currency = config.get<string>('MP_CURRENCY') || 'ARS';
    this.webUrl = config.get<string>('WEB_URL') || 'http://localhost:5173';
    this.notificationUrl = config.get<string>('MP_NOTIFICATION_URL') || '';
  }

  private get configured(): boolean {
    return !!this.accessToken && !this.accessToken.includes('xxxx');
  }

  private client() {
    if (!this.configured) {
      throw new BadRequestException(
        'Mercado Pago no esta configurado. Define un MP_ACCESS_TOKEN de prueba valido en .env.',
      );
    }
    return new MercadoPagoConfig({ accessToken: this.accessToken });
  }

  async checkout(userId: number, items: CartItemInput[], deliveryMethod: DeliveryMethod) {
    // Validate MP config before creating the order to avoid orphan pending orders.
    const client = this.client();
    const order = await this.orders.createPending(userId, items, deliveryMethod);

    const preference = new Preference(client);
    const body: any = {
      items: order.items.map((i) => ({
        id: String(i.productId),
        title: `${i.brand} ${i.model}`,
        quantity: i.quantity,
        unit_price: Number(i.unitPriceArs),
        currency_id: this.currency,
      })),
      external_reference: String(order.id),
      back_urls: {
        success: `${this.webUrl}/checkout/result?status=success&order=${order.id}`,
        failure: `${this.webUrl}/checkout/result?status=failure&order=${order.id}`,
        pending: `${this.webUrl}/checkout/result?status=pending&order=${order.id}`,
      },
    };
    // Mercado Pago rejects auto_return when back_urls point to localhost
    // ("auto_return invalid. back_url.success must be defined"). Only enable it
    // for a public WEB_URL; on localhost the user returns via the MP button.
    if (!/localhost|127\.0\.0\.1/.test(this.webUrl)) {
      body.auto_return = 'approved';
    }
    if (this.notificationUrl) body.notification_url = this.notificationUrl;

    let res: any;
    try {
      res = await preference.create({ body });
    } catch (e: any) {
      this.logger.error(`MP preference.create failed: ${e?.message || e}`);
      await this.orders.markFailed(order.id);
      throw new BadRequestException(
        'No se pudo crear la preferencia de pago. Verifica tus credenciales de prueba de Mercado Pago.',
      );
    }
    // With TEST credentials the regular init_point already runs in test mode;
    // sandbox_init_point is the legacy sandbox and mixing it with TEST creds
    // triggers "una de las partes es de prueba". Prefer init_point.
    const initPoint = res.init_point || res.sandbox_init_point;
    await this.orders.attachPreference(order.id, res.id!, initPoint);

    return { orderId: order.id, preferenceId: res.id, initPoint };
  }

  /** Processes a Mercado Pago IPN/webhook notification. */
  async handleWebhook(query: any, body: any): Promise<{ ok: boolean }> {
    try {
      const type = query?.type || query?.topic || body?.type;
      const paymentId =
        query?.['data.id'] || query?.id || body?.data?.id || body?.['data.id'];
      if (type !== 'payment' || !paymentId) return { ok: true };

      const payment = new Payment(this.client());
      const info: any = await payment.get({ id: String(paymentId) });
      const orderId = Number(info.external_reference);
      if (!orderId) return { ok: true };

      if (info.status === 'approved') {
        await this.orders.markPaid(orderId, String(paymentId));
      } else if (info.status === 'rejected' || info.status === 'cancelled') {
        await this.orders.markFailed(orderId, String(paymentId));
      }
      return { ok: true };
    } catch (e) {
      this.logger.error(`Webhook error: ${e}`);
      return { ok: true }; // always 200 so MP stops retrying noisily in sandbox
    }
  }

  /**
   * Sandbox convenience: when MP redirects back to the success URL (and there is
   * no public webhook in local dev), the result page confirms the order here.
   * Owner-checked. In production this MUST be replaced by the webhook only.
   */
  async confirmFromRedirect(
    userId: number,
    orderId: number,
    status: string,
  ): Promise<{ status: string }> {
    const order = await this.orders.one(orderId, userId); // throws if not owner
    if (order.status === 'paid') return { status: 'paid' };
    if (status === 'success') {
      await this.orders.markPaid(orderId, `sandbox-${Date.now()}`);
      return { status: 'paid' };
    }
    if (status === 'failure') {
      await this.orders.markFailed(orderId);
      return { status: 'failed' };
    }
    return { status: order.status };
  }
}
