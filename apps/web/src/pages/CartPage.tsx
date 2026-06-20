import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart } from 'lucide-react';
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

  const checkout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ orderId: number; initPoint: string }>('/payments/checkout', {
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      if (res.initPoint) {
        // store order id so the result page can confirm in sandbox
        sessionStorage.setItem('gp_last_order', String(res.orderId));
        window.location.href = res.initPoint;
      } else {
        setError('No se pudo iniciar el pago.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar el checkout');
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <ShoppingCart className="mx-auto mb-4 text-slate-400" size={48} />
        <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
        <Link to="/catalog">
          <Button variant="primary" className="mt-4">Ver catálogo</Button>
        </Link>
      </div>
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
        <div className="flex justify-between text-sm text-slate-500">
          <span>Subtotal</span>
          <span>{formatArs(cart.total)}</span>
        </div>
        <div className="my-3 border-t border-slate-200" />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatArs(cart.total)}</span>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button variant="primary" className="mt-4 w-full" onClick={checkout} disabled={loading}>
          {loading ? 'Redirigiendo…' : 'Pagar con Mercado Pago'}
        </Button>
        <p className="mt-2 text-center text-xs text-slate-500">Entorno de pruebas (sandbox)</p>
      </Card>
    </div>
  );
}
