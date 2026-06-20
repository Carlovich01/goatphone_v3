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
import { Store, Truck, ArrowRight } from 'lucide-react';
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
};

function OrderRow({ o, onChange }: { o: Order; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const next = nextOrderStatus(o.status, o.deliveryMethod);
  const fulfillable = o.status !== 'pending' && o.status !== 'failed';
  const steps = FULFILLMENT_STEPS[o.deliveryMethod];

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
      </div>

      <p className="mt-2 text-sm text-slate-600">
        {o.items.map((i) => `${i.quantity}× ${i.model}`).join(', ')} — <b>{formatArs(o.totalArs)}</b>
      </p>

      {fulfillable && (
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

  const totalPaid = (data ?? [])
    .filter((o) => o.status !== 'pending' && o.status !== 'failed')
    .reduce((s, o) => s + o.totalArs, 0);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-orders'] });

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-slate-500">Ingresos confirmados (pagados)</p>
        <p className="text-2xl font-bold text-green-600">{formatArs(totalPaid)}</p>
      </Card>

      {(data?.length ?? 0) === 0 ? (
        <p className="text-slate-500">No hay órdenes todavía.</p>
      ) : (
        data!.map((o) => <OrderRow key={o.id} o={o} onChange={refresh} />)
      )}
    </div>
  );
}
