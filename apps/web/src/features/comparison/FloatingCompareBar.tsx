import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GitCompare, X, Trash2, Plus } from 'lucide-react';
import { ComparisonResult } from '@goatphone/shared';
import { api } from '@/lib/api';
import { formatArs } from '@/lib/format';
import { useCompare } from '@/store/compare';
import { Button } from '@/components/ui';

export function FloatingCompareBar() {
  const { ids, remove, clear } = useCompare();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // fetch product info (brand/model/image/price) for the selected ids
  const { data } = useQuery({
    queryKey: ['compare-bar', ids.join(',')],
    queryFn: () => api.get<ComparisonResult>(`/comparison?ids=${ids.join(',')}`),
    enabled: ids.length > 0,
  });

  // hidden when nothing selected or already on the compare page
  if (ids.length === 0 || location.pathname === '/compare') return null;

  const products = data?.products ?? [];

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[calc(100vw-2rem)] max-w-xs sm:bottom-6 sm:left-6">
      {/* full list panel, opened straight from the floating circle */}
      {open && (
        <div className="mb-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white shadow-2xl ring-1 ring-white">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <span className="text-sm font-semibold">Comparando ({ids.length}/4)</span>
            <button onClick={clear} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400">
              <Trash2 size={14} /> Limpiar
            </button>
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            {products.length === 0 ? (
              <p className="px-2 py-3 text-sm text-slate-400">Cargando…</p>
            ) : (
              products.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-800">
                  <Link to={`/product/${p.id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.model} className="h-full w-full object-contain p-0.5" />
                    ) : (
                      <span className="text-[9px] text-slate-400">—</span>
                    )}
                  </Link>
                  <Link to={`/product/${p.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-slate-400">{p.brand}</p>
                    <p className="truncate text-xs font-medium">{p.model}</p>
                    <p className="text-[11px] text-brand-light">{formatArs(p.priceArs)}</p>
                  </Link>
                  <button
                    onClick={() => remove(p.id)}
                    className="rounded p-1 text-slate-400 hover:text-red-400"
                    title="Quitar"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-800 p-2">
            <Link to="/compare">
              <Button variant="primary" className="w-full">
                <GitCompare size={16} /> Ver comparación
              </Button>
            </Link>
            <Link to="/catalog" className="mt-3 block">
              <Button variant="primary" className="w-full">
                <Plus size={16} /> Agregar celulares
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* floating circle — tap toggles the full list */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={`Comparación (${ids.length})`}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg ring-1 ring-white transition hover:bg-slate-800"
      >
        {open ? <X size={22} /> : <GitCompare className="text-brand-light" size={22} />}
        {!open && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-brand px-1 text-xs font-bold">
            {ids.length}
          </span>
        )}
      </button>
    </div>
  );
}
