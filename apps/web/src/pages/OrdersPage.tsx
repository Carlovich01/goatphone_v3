import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Order,
  ORDER_STATUS_LABELS,
  DELIVERY_LABELS,
  FULFILLMENT_STEPS,
  canClaimWarranty,
} from '@goatphone/shared';
import { CheckCircle2, Circle, Store, Truck, ShieldCheck, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Card, Spinner, Badge } from '@/components/ui';
import { formatArs } from '@/lib/format';

const statusStyle: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-700',
  pending: 'bg-amber-500/20 text-amber-600',
  failed: 'bg-red-500/20 text-red-700',
  ready_pickup: 'bg-blue-500/20 text-blue-700',
  preparing: 'bg-blue-500/20 text-blue-700',
  shipped: 'bg-indigo-500/20 text-indigo-700',
  delivered: 'bg-green-600/20 text-green-800',
  warranty_claimed: 'bg-orange-500/20 text-orange-700',
  warranty_accepted: 'bg-green-600/20 text-green-800',
  warranty_rejected: 'bg-red-500/20 text-red-700',
};

/** Warranty status / claim action for a delivered (or claimed) order. */
function Warranty({ order, onChange }: { order: Order; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState('');
  const claimable = canClaimWarranty(order);

  if (order.status === 'delivered' && order.warrantyUntil) {
    const claim = async () => {
      setBusy(true);
      try {
        await api.post(`/orders/${order.id}/warranty-claim`, { description: desc });
        onChange();
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck size={14} className="text-green-600" />
          <span>Garantía hasta {new Date(order.warrantyUntil).toLocaleDateString('es-AR')}</span>
          {claimable && !showForm && (
            <Button variant="outline" className="ml-auto px-2 py-1" onClick={() => setShowForm(true)}>
              Reclamar garantía
            </Button>
          )}
        </div>

        {claimable && showForm && (
          <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
            <p className="flex items-start gap-1 text-[11px] font-medium text-amber-700">
              <Info size={13} className="mt-0.5 shrink-0" />
              Los reclamos de garantía se gestionan en el <b>local físico</b>. Acercate con tu
              comprobante y el equipo; este formulario solo registra tu reclamo.
            </p>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describí el problema del producto…"
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <div className="flex gap-2">
              <Button variant="primary" className="px-3 py-1" onClick={claim} disabled={busy || !desc.trim()}>
                {busy ? 'Enviando…' : 'Enviar reclamo'}
              </Button>
              <Button variant="ghost" className="px-3 py-1" onClick={() => setShowForm(false)} disabled={busy}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (order.status === 'warranty_claimed') {
    return (
      <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-orange-700">
        <p>Reclamo de garantía enviado. Gestionalo en el <b>local físico</b> con tu comprobante.</p>
        {order.warrantyClaim && <p className="mt-1 text-slate-500">Tu descripción: {order.warrantyClaim}</p>}
      </div>
    );
  }
  if (order.status === 'warranty_accepted') {
    return (
      <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-green-700">
        Tu reclamo de garantía fue <b>aceptado</b>.
      </p>
    );
  }
  if (order.status === 'warranty_rejected') {
    return (
      <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-red-700">
        Tu reclamo de garantía fue <b>rechazado</b>.
      </p>
    );
  }
  return null;
}

/** Progress timeline for paid orders (per delivery method). */
function Timeline({ order }: { order: Order }) {
  if (order.status === 'pending' || order.status === 'failed') return null;
  const steps = FULFILLMENT_STEPS[order.deliveryMethod];
  // warranty statuses come after delivery, so the timeline is fully complete
  const isWarranty = order.status.startsWith('warranty_');
  const current = isWarranty ? steps.length - 1 : steps.indexOf(order.status);
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
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<Order[]>('/orders'),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['orders'] });

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
            <Warranty order={o} onChange={refresh} />
          </Card>
        ))
      )}
    </div>
  );
}
