import { Routes, Route, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { AdminProductsPage } from './AdminProductsPage';
import { AdminOrdersPage } from './AdminOrdersPage';

function Tab({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'rounded-lg px-4 py-2 text-sm font-medium',
          isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100',
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function AdminPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <p className="text-sm text-slate-500">Gestioná el catálogo y revisá las ventas.</p>
      </div>
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <Tab to="/admin" label="Catálogo" end />
        <Tab to="/admin/orders" label="Órdenes" />
      </div>
      <Routes>
        <Route index element={<AdminProductsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
      </Routes>
    </div>
  );
}
