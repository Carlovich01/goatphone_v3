import { OfferLike, isOfferActive } from '@goatphone/shared';
import { formatArs } from '@/lib/format';

/**
 * Shows the product price, accounting for an active temporary offer:
 * struck-through base price + green offer price (and optional expiry note).
 */
export function PriceTag({
  p,
  className = '',
  priceClass = 'text-lg font-bold',
  showUntil = false,
}: {
  p: OfferLike;
  className?: string;
  priceClass?: string;
  showUntil?: boolean;
}) {
  const active = isOfferActive(p);

  if (!active) {
    return <span className={`${priceClass} ${className}`}>{formatArs(p.priceArs)}</span>;
  }

  return (
    <span className={`flex flex-col ${className}`}>
      <span className="flex items-baseline gap-2">
        <span className={`${priceClass} text-green-600`}>{formatArs(p.offerPriceArs as number)}</span>
        <span className="text-xs text-slate-400 line-through">{formatArs(p.priceArs)}</span>
      </span>
      {showUntil && p.offerEndsAt && (
        <span className="text-[11px] font-medium text-green-700">
          Oferta hasta {new Date(p.offerEndsAt).toLocaleDateString('es-AR')}
        </span>
      )}
    </span>
  );
}
