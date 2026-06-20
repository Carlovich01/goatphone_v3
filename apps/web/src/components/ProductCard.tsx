import { Link } from 'react-router-dom';
import { GitCompare, ShoppingCart, Check, MemoryStick, HardDrive } from 'lucide-react';
import { ProductSummary } from '@goatphone/shared';
import { formatArs } from '@/lib/format';
import { ScoreBadge } from './ScoreBadge';
import { Button } from './ui';
import { useCompare } from '@/store/compare';
import { useCart } from '@/store/cart';

export function ProductCard({ p }: { p: ProductSummary }) {
  const compare = useCompare();
  const cart = useCart();
  const selected = compare.has(p.id);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand/60">
      <Link to={`/product/${p.id}`} className="relative block">
        <div className="flex h-44 items-center justify-center">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={`${p.brand} ${p.model}`} className="h-full w-full object-contain p-3" />
          ) : (
            <span className="text-slate-400">Sin imagen</span>
          )}
        </div>
        <div className="absolute right-2 top-2">
          <ScoreBadge score={p.score} size="sm" />
        </div>
        {p.stock <= 0 && (
          <span className="absolute left-2 top-2 rounded bg-red-600/90 px-2 py-0.5 text-xs">
            Sin stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{p.brand}</p>
          <Link to={`/product/${p.id}`} className="font-semibold hover:text-brand-dark">
            {p.model}
          </Link>
        </div>
        {(p.ram != null || p.storage != null) && (
          <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">
            {p.ram != null && (
              <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5" title="Memoria RAM">
                <MemoryStick size={13} className="text-slate-500" /> {p.ram} GB
              </span>
            )}
            {p.storage != null && (
              <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5" title="Almacenamiento">
                <HardDrive size={13} className="text-slate-500" /> {p.storage} GB
              </span>
            )}
          </div>
        )}
        <p className="text-lg font-bold">{formatArs(p.priceArs)}</p>

        <div className="mt-auto flex gap-2">
          <Button
            variant={selected ? 'primary' : 'outline'}
            className="flex-1 px-2"
            onClick={() => compare.toggle(p.id)}
            disabled={!selected && compare.full}
            title={compare.full && !selected ? 'Máximo 4 para comparar' : 'Comparar'}
          >
            {selected ? <Check size={16} /> : <GitCompare size={16} />}
            {selected ? 'Añadido' : 'Comparar'}
          </Button>
          <Button
            variant="primary"
            className="px-3"
            disabled={p.stock <= 0}
            onClick={() =>
              cart.add({
                productId: p.id,
                brand: p.brand,
                model: p.model,
                priceArs: p.priceArs,
                imageUrl: p.imageUrl,
              })
            }
            title="Agregar al carrito"
          >
            <ShoppingCart size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
