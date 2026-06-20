import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, GitCompare, LogOut, Shield, Smartphone } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useCart } from '@/store/cart';
import { useCompare } from '@/store/compare';
import { Badge, Button } from './ui';

export function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { ids } = useCompare();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
          <Smartphone className="text-brand-light" size={22} />
          GOAT<span className="text-brand-light">PHONE</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/catalog">
            <Button variant="nav">Catálogo</Button>
          </Link>

          <Link to="/compare" className="relative">
            <Button variant="nav">
              <GitCompare size={18} /> Comparar
              {ids.length > 0 && (
                <Badge className="bg-brand text-white">{ids.length}</Badge>
              )}
            </Button>
          </Link>

          <Link to="/cart" className="relative">
            <Button variant="nav">
              <ShoppingCart size={18} />
              {count > 0 && <Badge className="bg-brand text-white">{count}</Badge>}
            </Button>
          </Link>

          {user?.role === 'admin' && (
            <Link to="/admin">
              <Button variant="nav" className="border border-white/25">
                <Shield size={16} /> Admin
              </Button>
            </Link>
          )}

          {user ? (
            <>
              <Link to="/orders">
                <Button variant="nav">Mis compras</Button>
              </Link>
              <Link to="/account">
                <Button variant="nav">Mi cuenta</Button>
              </Link>
              <span className="hidden text-sm text-slate-400 sm:inline">{user.name}</span>
              <Button variant="nav" onClick={logout} title="Salir">
                <LogOut size={18} />
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => navigate('/login')}>
              Ingresar
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
