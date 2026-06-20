import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_LABELS,
  DELIVERY_LABELS,
  FULFILLMENT_STEPS,
  nextOrderStatus,
} from '@goatphone/shared';
import { Store, Truck, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Card, Spinner, Badge, Select } from '@/components/ui';
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

function Stat({ label, value, accent = 'text-slate-800' }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
    </Card>
  );
}

function OrderRow({ o, onChange }: { o: Order; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const next = nextOrderStatus(o.status, o.deliveryMethod);
  const steps = FULFILLMENT_STEPS[o.deliveryMethod];
  const inFulfillment = steps.includes(o.status);
  const claimOpen = o.status === 'warranty_claimed';

  const setStatus = async (status: OrderStatus) => {
    setBusy(true);
    try {
      await api.patch(`/orders/${o.id}/status`, { status });
      onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Orden #{o.id}</p>
          <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString('es-AR')}</p>
        </div>
        <Badge className={statusStyle[o.status]}>{ORDER_STATUS_LABELS[o.status] ?? o.status}</Badge>
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
        {o.deliveryMethod === 'shipping' && o.address && <span>Dirección: {o.address}</span>}
        {o.warrantyUntil && (
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-green-600" />
            Garantía hasta {new Date(o.warrantyUntil).toLocaleDateString('es-AR')}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-slate-600">
        {o.items.map((i) => `${i.quantity}× ${i.model}`).join(', ')} — <b>{formatArs(o.totalArs)}</b>
      </p>

      {inFulfillment && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          {next && (
            <Button variant="primary" className="px-3 py-1" onClick={() => setStatus(next)} disabled={busy}>
              <ArrowRight size={14} /> {ORDER_STATUS_LABELS[next]}
            </Button>
          )}
          <Select
            value={o.status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            disabled={busy}
            className="w-auto text-sm"
          >
            {steps.map((s) => (
              <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </div>
      )}

      {claimOpen && (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          {o.warrantyClaim && (
            <p className="rounded-lg bg-orange-50 p-2 text-xs text-orange-800">
              <b>Reclamo del cliente:</b> {o.warrantyClaim}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-orange-700">Resolver reclamo de garantía:</span>
            <Button variant="primary" className="px-3 py-1" onClick={() => setStatus('warranty_accepted')} disabled={busy}>
              Aceptar garantía
            </Button>
            <Button variant="danger" className="px-3 py-1" onClick={() => setStatus('warranty_rejected')} disabled={busy}>
              Rechazar garantía
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function AdminOrdersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get<Order[]>('/orders/all'),
  });

  if (isLoading) return <Spinner label="Cargando órdenes…" />;

  const orders = data ?? [];
  const isConfirmed = (o: Order) => o.status !== 'pending' && o.status !== 'failed';
  const confirmed = orders.filter(isConfirmed);

  const revenue = confirmed.reduce((s, o) => s + o.totalArs, 0);
  const unitsSold = confirmed.reduce(
    (s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0),
    0,
  );
  const delivered = orders.filter(
    (o) => o.status === 'delivered' || o.status.startsWith('warranty_'),
  ).length;
  const inProcess = orders.filter((o) =>
    ['paid', 'ready_pickup', 'preparing', 'shipped'].includes(o.status),
  ).length;
  const claimsOpen = orders.filter((o) => o.status === 'warranty_claimed').length;
  const claimsAccepted = orders.filter((o) => o.status === 'warranty_accepted').length;
  const claimsRejected = orders.filter((o) => o.status === 'warranty_rejected').length;
  const pendingPay = orders.filter((o) => o.status === 'pending').length;

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-orders'] });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ingresos confirmados" value={formatArs(revenue)} accent="text-green-600" />
        <Stat label="Celulares vendidos" value={String(unitsSold)} />
        <Stat label="Órdenes confirmadas" value={String(confirmed.length)} />
        <Stat label="Entregadas" value={String(delivered)} />
        <Stat label="En proceso" value={String(inProcess)} />
        <Stat label="Pago pendiente" value={String(pendingPay)} accent="text-amber-600" />
        <Stat label="Reclamos abiertos" value={String(claimsOpen)} accent="text-orange-600" />
        <Stat
          label="Garantías ac./rech."
          value={`${claimsAccepted} / ${claimsRejected}`}
        />
      </div>

      {orders.length === 0 ? (
        <p className="text-slate-500">No hay órdenes todavía.</p>
      ) : (
        orders.map((o) => <OrderRow key={o.id} o={o} onChange={refresh} />)
      )}
    </div>
  );
}
