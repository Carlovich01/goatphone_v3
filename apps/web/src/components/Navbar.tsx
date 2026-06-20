import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, GitCompare, LogOut, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useCart } from '@/store/cart';
import { useCompare } from '@/store/compare';
import { Badge, Button } from './ui';

export function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { ids } = useCompare();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // close the mobile menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // shared link list, reused on desktop (inline) and mobile (stacked)
  const links = (
    <>
      <Link to="/catalog">
        <Button variant="nav" className="w-full justify-start sm:w-auto sm:justify-center">
          Catálogo
        </Button>
      </Link>

      <Link to="/about">
        <Button variant="nav" className="w-full justify-start sm:w-auto sm:justify-center">
          Nosotros
        </Button>
      </Link>

      <Link to="/compare" className="relative">
        <Button variant="nav" className="w-full justify-start sm:w-auto sm:justify-center">
          <GitCompare size={18} /> Comparar
          {ids.length > 0 && <Badge className="bg-brand text-white">{ids.length}</Badge>}
        </Button>
      </Link>

      <Link to="/cart" className="relative">
        <Button variant="nav" className="w-full justify-start sm:w-auto sm:justify-center">
          <ShoppingCart size={18} />
          <span className="sm:hidden">Carrito</span>
          {count > 0 && <Badge className="bg-brand text-white">{count}</Badge>}
        </Button>
      </Link>

      {user?.role === 'admin' && (
        <Link to="/admin">
          <Button
            variant="nav"
            className="w-full justify-start border-white/25 sm:w-auto sm:justify-center sm:border"
          >
            <Shield size={16} /> Admin
          </Button>
        </Link>
      )}

      {user ? (
        <>
          <Link to="/orders">
            <Button variant="nav" className="w-full justify-start sm:w-auto sm:justify-center">
              Mis compras
            </Button>
          </Link>
          <Link to="/account">
            <Button variant="nav" className="w-full justify-start sm:w-auto sm:justify-center">
              Mi cuenta
            </Button>
          </Link>
          <span className="hidden text-sm text-slate-400 lg:inline">{user.name}</span>
          <Button
            variant="nav"
            onClick={logout}
            title="Salir"
            className="w-full justify-start sm:w-auto sm:justify-center"
          >
            <LogOut size={18} /> <span className="sm:hidden">Salir</span>
          </Button>
        </>
      ) : (
        <Button
          variant="primary"
          onClick={() => navigate('/login')}
          className="w-full justify-center sm:w-auto"
        >
          Ingresar
        </Button>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="GoatPhone" className="h-9 w-9 rounded-lg object-contain" />
          <span className="text-lg font-extrabold tracking-tight">
            <span className="text-brand-light">GOAT</span>
            <span className="text-white">PHONE</span>
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex sm:gap-2">{links}</nav>

        {/* mobile quick actions + hamburger */}
        <div className="flex items-center gap-1 sm:hidden">
          <Link to="/cart" className="relative">
            <Button variant="nav" className="px-2">
              <ShoppingCart size={20} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold">
                  {count}
                </span>
              )}
            </Button>
          </Link>
          <Button
            variant="nav"
            className="px-2"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </Button>
        </div>
      </div>

      {/* mobile dropdown menu */}
      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-slate-800 px-4 py-3 sm:hidden">
          {user && <span className="px-2 pb-1 text-xs text-slate-400">Hola, {user.name}</span>}
          {links}
        </nav>
      )}
    </header>
  );
}
