import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProductSummary } from '@goatphone/shared';
import { api } from '@/lib/api';
import { Button, Input, Select, Spinner } from '@/components/ui';
import { ProductCard } from '@/components/ProductCard';

export function CatalogPage() {
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [only5g, setOnly5g] = useState(false);
  const [sort, setSort] = useState('score');

  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get<string[]>('/catalog/brands'),
  });

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (brand) params.set('brand', brand);
  if (priceMax) params.set('priceMax', priceMax);
  if (only5g) params.set('only5g', 'true');
  if (sort) params.set('sort', sort);

  const { data, isLoading } = useQuery({
    queryKey: ['catalog', params.toString()],
    queryFn: () => api.get<ProductSummary[]>(`/catalog?${params.toString()}`),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-semibold">Filtros</h3>
          <label className="mb-1 block text-xs text-slate-500">Buscar</label>
          <Input placeholder="Modelo o marca" value={q} onChange={(e) => setQ(e.target.value)} />

          <label className="mb-1 mt-3 block text-xs text-slate-500">Marca</label>
          <Select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Todas</option>
            {(brands.data ?? []).map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>

          <label className="mb-1 mt-3 block text-xs text-slate-500">Precio máximo (ARS)</label>
          <Input
            type="number"
            placeholder="Sin límite"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={only5g} onChange={(e) => setOnly5g(e.target.checked)} />
            Solo 5G
          </label>

          <label className="mb-1 mt-3 block text-xs text-slate-500">Ordenar por</label>
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="score">Mejor puntaje</option>
            <option value="priceAsc">Precio: menor a mayor</option>
            <option value="priceDesc">Precio: mayor a menor</option>
            <option value="newest">Más nuevos</option>
          </Select>

          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => {
              setQ(''); setBrand(''); setPriceMax(''); setOnly5g(false); setSort('score');
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </aside>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Catálogo</h2>
          <span className="text-sm text-slate-500">{data?.length ?? 0} celulares</span>
        </div>
        {isLoading ? (
          <Spinner label="Cargando…" />
        ) : (data?.length ?? 0) === 0 ? (
          <p className="text-slate-500">No se encontraron celulares con esos filtros.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {data!.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
