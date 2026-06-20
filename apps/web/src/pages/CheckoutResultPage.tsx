import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Card, Spinner } from '@/components/ui';
import { useCart } from '@/store/cart';

export function CheckoutResultPage() {
  const [params] = useSearchParams();
  const status = params.get('status') || 'pending';
  const orderId = params.get('order') || sessionStorage.getItem('gp_last_order');
  const cart = useCart();
  const [confirmed, setConfirmed] = useState<string>('loading');

  useEffect(() => {
    if (!orderId) {
      setConfirmed(status);
      return;
    }
    // Sandbox: confirm the order from the redirect (no public webhook in local dev)
    api
      .post<{ status: string }>(`/payments/confirm/${orderId}?status=${status}`)
      .then((r) => {
        setConfirmed(r.status);
        if (r.status === 'paid') cart.clear();
      })
      .catch(() => setConfirmed(status));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (confirmed === 'loading') return <Spinner label="Confirmando pago…" />;

  const ok = confirmed === 'paid' || status === 'success';
  const failed = confirmed === 'failed' || status === 'failure';

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Card>
        {ok ? (
          <>
            <CheckCircle2 className="mx-auto mb-3 text-green-600" size={56} />
            <h1 className="text-2xl font-bold">¡Pago aprobado!</h1>
            <p className="mt-2 text-slate-500">Tu compra fue registrada y el stock actualizado.</p>
          </>
        ) : failed ? (
          <>
            <XCircle className="mx-auto mb-3 text-red-600" size={56} />
            <h1 className="text-2xl font-bold">Pago rechazado</h1>
            <p className="mt-2 text-slate-500">No se pudo completar el pago. Probá nuevamente.</p>
          </>
        ) : (
          <>
            <Clock className="mx-auto mb-3 text-amber-600" size={56} />
            <h1 className="text-2xl font-bold">Pago pendiente</h1>
            <p className="mt-2 text-slate-500">Tu pago está siendo procesado.</p>
          </>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/orders">
            <Button variant="primary">Ver mis compras</Button>
          </Link>
          <Link to="/catalog">
            <Button variant="outline">Seguir comprando</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
