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

export function AdminOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.get<Order[]>('/orders/all'),
  });

  if (isLoading) return <Spinner label="Cargando órdenes…" />;

  const totalPaid = (data ?? [])
    .filter((o) => o.status === 'paid')
    .reduce((s, o) => s + o.totalArs, 0);

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-slate-500">Ingresos confirmados (pagados)</p>
        <p className="text-2xl font-bold text-green-600">{formatArs(totalPaid)}</p>
      </Card>

      {(data?.length ?? 0) === 0 ? (
        <p className="text-slate-500">No hay órdenes todavía.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((o) => (
                <tr key={o.id} className="border-t border-slate-200">
                  <td className="p-3">{o.id}</td>
                  <td className="p-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString('es-AR')}</td>
                  <td className="p-3">{o.items.map((i) => `${i.quantity}× ${i.model}`).join(', ')}</td>
                  <td className="p-3 font-medium">{formatArs(o.totalArs)}</td>
                  <td className="p-3">
                    <Badge className={statusStyle[o.status]}>{o.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
