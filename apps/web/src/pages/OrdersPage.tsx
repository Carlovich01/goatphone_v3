import { useQuery } from '@tanstack/react-query';
import { Order } from '@goatphone/shared';
import { api } from '@/lib/api';
import { Card, Spinner, Badge } from '@/components/ui';
import { formatArs } from '@/lib/format';

const statusStyle: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-700',
  pending: 'bg-amber-500/20 text-amber-600',
  failed: 'bg-red-500/20 text-red-700',
};
const statusLabel: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  failed: 'Rechazado',
};

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
              <Badge className={statusStyle[o.status]}>{statusLabel[o.status] ?? o.status}</Badge>
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
          </Card>
        ))
      )}
    </div>
  );
}
