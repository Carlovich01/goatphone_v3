import { Link } from 'react-router-dom';
import { CatalogPhoneRef } from '@goatphone/shared';
import { formatArs, specValueLabel } from '@/lib/format';

export function PhoneStripe({
  phones,
  unit,
  title,
  decimals,
}: {
  phones: CatalogPhoneRef[];
  unit?: string;
  title?: string;
  decimals?: number;
}) {
  if (!phones?.length) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        No hay celulares del catálogo en este intervalo.
      </p>
    );
  }
  return (
    <div className="mt-3">
      {title && <p className="mb-1 text-xs text-slate-500">{title}</p>}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {phones.map((p) => (
          <Link
            key={p.id}
            to={`/product/${p.id}`}
            className="flex w-40 shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 p-2 hover:border-brand"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.model} className="h-full w-full object-contain p-0.5" />
              ) : (
                <span className="text-[9px] text-slate-400">—</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-slate-500">{p.brand}</p>
              <p className="truncate text-xs font-medium">{p.model}</p>
              <p className="text-[11px] text-brand-dark">
                {specValueLabel(p.value, unit, decimals)} · {formatArs(p.priceArs)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
