import { useQuery } from '@tanstack/react-query';
import {
  Order,
  ORDER_STATUS_LABELS,
  DELIVERY_LABELS,
  FULFILLMENT_STEPS,
} from '@goatphone/shared';
import { CheckCircle2, Circle, Store, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, Spinner, Badge } from '@/components/ui';
import { formatArs } from '@/lib/format';

const statusStyle: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-700',
  pending: 'bg-amber-500/20 text-amber-600',
  failed: 'bg-red-500/20 text-red-700',
  ready_pickup: 'bg-blue-500/20 text-blue-700',
  preparing: 'bg-blue-500/20 text-blue-700',
  shipped: 'bg-indigo-500/20 text-indigo-700',
  delivered: 'bg-green-600/20 text-green-800',
};

/** Progress timeline for paid orders (per delivery method). */
function Timeline({ order }: { order: Order }) {
  if (order.status === 'pending' || order.status === 'failed') return null;
  const steps = FULFILLMENT_STEPS[order.deliveryMethod];
  const current = steps.indexOf(order.status);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-200 pt-3 text-xs">
      {steps.map((s, i) => {
        const done = i <= current;
        return (
          <span key={s} className="flex items-center gap-1">
            {done ? (
              <CheckCircle2 size={14} className="text-green-600" />
            ) : (
              <Circle size={14} className="text-slate-300" />
            )}
            <span className={done ? 'font-medium text-slate-700' : 'text-slate-400'}>
              {ORDER_STATUS_LABELS[s]}
            </span>
            {i < steps.length - 1 && <span className="text-slate-300">→</span>}
          </span>
        );
      })}
    </div>
  );
}

export function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<Order[]>('/orders'),
  });

  if (isLoading) return <Spinner label="Cargando compras…" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mis compras</h1>
      {(data?.length ?? 0) === 0 ? (
        <p className="text-slate-500">Todavía no realizaste compras.</p>
      ) : (
        data!.map((o) => (
          <Card key={o.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Orden #{o.id}</p>
                <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString('es-AR')}</p>
              </div>
              <Badge className={statusStyle[o.status]}>
                {ORDER_STATUS_LABELS[o.status] ?? o.status}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                {o.deliveryMethod === 'shipping' ? <Truck size={13} /> : <Store size={13} />}
                {DELIVERY_LABELS[o.deliveryMethod]}
              </span>
              {o.customerName && <span>Cliente: {o.customerName}</span>}
              {o.customerEmail && <span>Email: {o.customerEmail}</span>}
              {o.dni && <span>DNI: {o.dni}</span>}
              {o.phone && <span>Tel: {o.phone}</span>}
              {o.deliveryMethod === 'shipping' && o.address && <span>Envío a: {o.address}</span>}
            </div>

            <div className="mt-3 space-y-1 text-sm">
              {o.items.map((i) => (
                <div key={i.productId} className="flex justify-between text-slate-600">
                  <span>{i.quantity}× {i.brand} {i.model}</span>
                  <span>{formatArs(i.unitPriceArs * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 font-bold">
              <span>Total</span>
              <span>{formatArs(o.totalArs)}</span>
            </div>

            <Timeline order={o} />
          </Card>
        ))
      )}
    </div>
  );
}
