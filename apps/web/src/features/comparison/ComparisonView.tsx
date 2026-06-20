import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X, Trophy, MemoryStick, HardDrive } from 'lucide-react';
import { ComparisonResult, SPEC_CATEGORIES, SPEC_DEFS, effectivePrice } from '@goatphone/shared';
import { api } from '@/lib/api';
import { Button, Card, Spinner } from '@/components/ui';
import { ScoreBadge } from '@/components/ScoreBadge';
import { PriceTag } from '@/components/PriceTag';
import { useCompare } from '@/store/compare';
import { useCart } from '@/store/cart';
import { SpecCard } from './SpecCard';
import { SummaryPanel } from './SummaryPanel';
import { CategoryRadar } from './CategoryRadar';
import { PHONE_COLORS } from './SpecChart';

/**
 * Versus-style comparison layout shared by the compare page and the single-phone
 * detail page. When `managed` is true it also renders the compare-store controls
 * (remove / clear); the single-phone view (`managed` false) hides them.
 */
export function ComparisonView({ ids, managed = false }: { ids: number[]; managed?: boolean }) {
  const compare = useCompare();
  const cart = useCart();
  const headerRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  // The navbar element is our portal target: the strip is rendered as its child
  // and pinned to `top-full`, so it is always flush with the navbar's bottom.
  const [navEl, setNavEl] = useState<HTMLElement | null>(null);
  const [navH, setNavH] = useState(56);

  const { data, isLoading } = useQuery({
    queryKey: ['comparison', ids.join(',')],
    queryFn: () => api.get<ComparisonResult>(`/comparison?ids=${ids.join(',')}`),
    enabled: ids.length >= 1,
  });

  useEffect(() => {
    const nav = document.querySelector('header');
    if (!nav) return;
    setNavEl(nav as HTMLElement);
    const update = () => setNavH(nav.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // Show the compact strip only once the big phone cards scroll out of view.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { rootMargin: `-${navH}px 0px 0px 0px`, threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [data, navH]);

  if (isLoading || !data) return <Spinner label="Calculando puntajes…" />;

  const { products, scores, winnerProductId } = data;

  if (!products.length) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">No se encontró el celular</h1>
        <p className="mt-2 text-slate-500">Es posible que ya no esté en el catálogo.</p>
        <Link to="/catalog">
          <Button variant="primary" className="mt-4">Volver al catálogo</Button>
        </Link>
      </div>
    );
  }

  const scoreById = new Map(scores.map((s) => [s.productId, s]));

  return (
    <div className="space-y-6">
      {managed && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Comparación</h1>
          <Button variant="ghost" onClick={compare.clear}>Limpiar todo</Button>
        </div>
      )}

      {/* Phone header cards — same column grid as the spec rows below */}
      <div
        ref={headerRef}
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0,1fr))` }}
      >
        {products.map((p, i) => {
          const sc = scoreById.get(p.id);
          const isWinner = p.id === winnerProductId && products.length > 1;
          return (
            <Card key={p.id} className={isWinner ? 'border-amber-500/60' : ''}>
              <div className="relative">
                {managed && (
                  <button
                    onClick={() => compare.remove(p.id)}
                    className="absolute right-0 top-0 rounded p-1 text-slate-500 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                )}
                {isWinner && (
                  <div className="absolute left-0 top-0 flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-600">
                    <Trophy size={12} /> Ganador
                  </div>
                )}
              </div>
              <div className="flex h-32 items-center justify-center">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.model} className="h-full object-contain" />
                ) : (
                  <span className="text-slate-400">Sin imagen</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{p.brand}</p>
                  <Link
                    to={`/product/${p.id}`}
                    className="block truncate font-semibold hover:underline"
                    style={{ color: PHONE_COLORS[i % PHONE_COLORS.length] }}
                    title={`Ver ${p.brand} ${p.model}`}
                  >
                    {p.model}
                  </Link>
                  <PriceTag p={p} priceClass="text-sm font-bold" showUntil />
                </div>
                {sc && <ScoreBadge score={sc.global} size="sm" />}
              </div>
              {((p.specs as any).ram != null || (p.specs as any).storage != null) && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
                  {(p.specs as any).ram != null && (
                    <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5" title="Memoria RAM">
                      <MemoryStick size={13} className="text-slate-500" /> {(p.specs as any).ram} GB
                    </span>
                  )}
                  {(p.specs as any).storage != null && (
                    <span className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5" title="Almacenamiento">
                      <HardDrive size={13} className="text-slate-500" /> {(p.specs as any).storage} GB
                    </span>
                  )}
                </div>
              )}
              <Button
                variant="primary"
                className="mt-3 w-full"
                disabled={p.stock <= 0}
                onClick={() => cart.add({ productId: p.id, brand: p.brand, model: p.model, priceArs: effectivePrice(p), imageUrl: p.imageUrl })}
              >
                {p.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Compact strip rendered as a child of the navbar (top-full = flush with
          its bottom edge). Appears only once the phone cards scroll out of view. */}
      {products.length >= 2 && navEl &&
        createPortal(
          <div
            className={`absolute inset-x-0 top-full border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur transition-all duration-200 ${
              showSticky ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
            }`}
          >
            <div className="mx-auto max-w-7xl px-4">
              <div
                className="grid gap-4 py-2"
                style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0,1fr))` }}
              >
                {products.map((p, i) => {
                  const color = PHONE_COLORS[i % PHONE_COLORS.length];
                  return (
                    <Link
                      key={p.id}
                      to={`/product/${p.id}`}
                      className="flex min-w-0 items-center gap-2"
                      title={`Ver ${p.brand} ${p.model}`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt="" className="h-6 w-6 shrink-0 object-contain" />
                      )}
                      <span className="truncate text-sm font-semibold" style={{ color }}>
                        {p.model}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>,
          navEl,
        )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryPanel ids={ids} />
        <CategoryRadar products={products} scores={scores} />
      </div>

      {/* Spec cards grouped by category */}
      {SPEC_CATEGORIES.map((cat) => {
        const defs = SPEC_DEFS.filter((s) => s.category === cat);
        if (!defs.length) return null;
        return (
          <div key={cat}>
            <h3 className="mb-2 mt-4 text-lg font-semibold text-brand-dark">{cat}</h3>
            <div className="space-y-2">
              {defs.map((def) => (
                <SpecCard key={def.key} def={def} products={products} ids={ids} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
