import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trash2, ShoppingCart, Store, Truck, CheckCircle2, Loader2, X } from 'lucide-react';
import { DeliveryMethod, Order, UserProfile } from '@goatphone/shared';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';
import { formatArs } from '@/lib/format';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';

export function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [delivery, setDelivery] = useState<DeliveryMethod>('pickup');
  // payment opened in another tab; we poll the order until MP confirms it
  const [watchOrderId, setWatchOrderId] = useState<number | null>(null);
  const [result, setResult] = useState<'paid' | 'failed' | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<UserProfile>('/users/me'),
    enabled: !!user,
  });

  // While the MP tab is open, poll this order's status every few seconds.
  const { data: watchedOrder } = useQuery({
    queryKey: ['order-watch', watchOrderId],
    queryFn: () => api.get<Order>(`/orders/${watchOrderId}`),
    enabled: watchOrderId != null && result == null,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!watchedOrder) return;
    if (watchedOrder.status === 'failed') {
      setResult('failed');
      setWatchOrderId(null);
    } else if (watchedOrder.status !== 'pending') {
      setResult('paid');
      setWatchOrderId(null);
      cart.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedOrder?.status]);

  // what the chosen method needs vs what the profile has
  const needsDni = !profile?.dni;
  const needsPhone = !profile?.phone;
  const needsAddress = delivery === 'shipping' && !profile?.address;
  const missing = !!user && (needsDni || needsPhone || needsAddress);

  const checkout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (missing) {
      navigate('/account');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ orderId: number; initPoint: string }>('/payments/checkout', {
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        deliveryMethod: delivery,
      });
      if (res.initPoint) {
        // store order id so the result page can confirm in sandbox
        sessionStorage.setItem('gp_last_order', String(res.orderId));
        // open MP in a NEW tab and keep this one to await confirmation
        window.open(res.initPoint, '_blank', 'noopener,noreferrer');
        setResult(null);
        setWatchOrderId(res.orderId);
      } else {
        setError('No se pudo iniciar el pago.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar el checkout');
    } finally {
      setLoading(false);
    }
  };

  // Rendered in both states so it still shows after the cart is cleared on success.
  const resultPopup = result && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <button
          onClick={() => setResult(null)}
          title="Cerrar"
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={18} />
        </button>
        {result === 'paid' ? (
          <>
            <CheckCircle2 className="mx-auto mb-3 text-green-600" size={64} />
            <h2 className="text-2xl font-bold text-green-700">¡Pago exitoso!</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tu compra fue registrada y el stock actualizado.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Link to="/orders">
                <Button variant="primary">Ver mis compras</Button>
              </Link>
              <Button variant="outline" onClick={() => setResult(null)}>Cerrar</Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-red-600">Pago rechazado</h2>
            <p className="mt-1 text-sm text-slate-500">No se pudo completar el pago. Probá de nuevo.</p>
            <Button variant="outline" className="mt-5" onClick={() => setResult(null)}>Cerrar</Button>
          </>
        )}
      </div>
    </div>
  );

  if (cart.items.length === 0) {
    return (
      <>
        {resultPopup}
        <div className="py-16 text-center">
          <ShoppingCart className="mx-auto mb-4 text-slate-400" size={48} />
          <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
          <Link to="/catalog">
            <Button variant="primary" className="mt-4">Ver catálogo</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Carrito</h1>
        {cart.items.map((i) => (
          <Card key={i.productId} className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100">
              {i.imageUrl ? (
                <img src={i.imageUrl} alt={i.model} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500">{i.brand}</p>
              <p className="font-semibold">{i.model}</p>
              <p className="text-sm text-slate-500">{formatArs(i.priceArs)}</p>
            </div>
            <input
              type="number"
              min={1}
              value={i.quantity}
              onChange={(e) => cart.setQty(i.productId, Number(e.target.value))}
              className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center text-sm"
            />
            <button onClick={() => cart.remove(i.productId)} className="text-slate-500 hover:text-red-600">
              <Trash2 size={18} />
            </button>
          </Card>
        ))}
      </div>

      <Card className="h-fit">
        <h3 className="mb-3 font-semibold">Resumen</h3>

        {/* delivery method */}
        <p className="mb-2 text-xs font-medium text-slate-500">¿Cómo lo recibís?</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setDelivery('pickup')}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs ${
              delivery === 'pickup' ? 'border-brand bg-brand/10 text-brand-dark' : 'border-slate-200 text-slate-600'
            }`}
          >
            <Store size={18} /> Retiro en local
          </button>
          <button
            onClick={() => setDelivery('shipping')}
            className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs ${
              delivery === 'shipping' ? 'border-brand bg-brand/10 text-brand-dark' : 'border-slate-200 text-slate-600'
            }`}
          >
            <Truck size={18} /> Envío a domicilio
          </button>
        </div>

        <div className="flex justify-between text-sm text-slate-500">
          <span>Subtotal</span>
          <span>{formatArs(cart.total)}</span>
        </div>
        <div className="my-3 border-t border-slate-200" />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatArs(cart.total)}</span>
        </div>

        {missing && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700">
            {needsDni && <p>Necesitás cargar tu <b>DNI</b> para continuar.</p>}
            {needsPhone && <p>Necesitás cargar tu <b>teléfono</b> para continuar.</p>}
            {needsAddress && <p>El envío a domicilio requiere tu <b>dirección</b>.</p>}
            <Link to="/account" className="font-semibold underline">Completar en Mi cuenta</Link>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {watchOrderId != null ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin text-brand" />
            <span>Esperando la confirmación del pago en la otra pestaña…</span>
          </div>
        ) : (
          <Button variant="primary" className="mt-4 w-full" onClick={checkout} disabled={loading}>
            {loading ? 'Abriendo Mercado Pago…' : missing ? 'Completar mis datos' : 'Pagar con Mercado Pago'}
          </Button>
        )}
      </Card>

      {resultPopup}
    </div>
  );
}
