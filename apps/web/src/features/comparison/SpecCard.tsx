import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { Product, SpecDef, SpecDistribution } from '@goatphone/shared';
import { api } from '@/lib/api';
import { specValueLabel } from '@/lib/format';
import { Modal, Spinner } from '@/components/ui';
import { SpecChart, PHONE_COLORS } from './SpecChart';

export function SpecCard({
  def,
  products,
  ids,
}: {
  def: SpecDef;
  products: Product[];
  ids: number[];
}) {
  const [open, setOpen] = useState(false);

  // consistent color per product (matches header & markers everywhere)
  const colors: Record<number, string> = Object.fromEntries(
    products.map((p, i) => [p.id, PHONE_COLORS[i % PHONE_COLORS.length]]),
  );

  const { data, isLoading } = useQuery({
    queryKey: ['spec-dist', def.key, ids.join(',')],
    queryFn: () =>
      api.get<SpecDistribution>(
        `/comparison/spec-distribution?spec=${def.key}&ids=${ids.join(',')}`,
      ),
    enabled: open,
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-brand/50 hover:bg-slate-50"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-medium">{def.label}</span>
          <BarChart3 size={16} className="shrink-0 text-slate-400" />
        </div>
        <div
          className="grid gap-2 sm:gap-4"
          style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0,1fr))` }}
        >
          {products.map((p, i) => (
            <div key={p.id} className="min-w-0">
              <span
                className="block truncate text-sm font-semibold sm:text-base"
                style={{ color: PHONE_COLORS[i % PHONE_COLORS.length] }}
                title={`${p.brand} ${p.model}`}
              >
                {specValueLabel((p.specs as any)[def.key], def.unit, def.decimals)}
              </span>
            </div>
          ))}
        </div>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={def.label}>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">{def.description}</p>
        {isLoading || !data ? (
          <Spinner label="Cargando gráfico…" />
        ) : (
          <SpecChart dist={data} colors={colors} />
        )}
      </Modal>
    </>
  );
}
