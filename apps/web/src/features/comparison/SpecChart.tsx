import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import { Check, X } from 'lucide-react';
import { SpecDistribution, CatalogPhoneRef, ComparedPhoneMarker, getSpecDef } from '@goatphone/shared';
import { specValueLabel } from '@/lib/format';
import { PhoneStripe } from './PhoneStripe';

export const PHONE_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#ec4899'];
const PIE_PALETTE = ['#7c3aed', '#06b6d4', '#f59e0b', '#ec4899', '#22c55e', '#64748b', '#ef4444', '#a78bfa'];

type Colors = Record<number, string>;

interface BarDatum {
  label: string;
  count: number;
  phones: CatalogPhoneRef[];
  comp: string[];
  idx: number;
}

/** A vertical reference line (mean / median) drawn over a bar chart. */
interface RefLine {
  /** x position in band-index coordinates (0 = first bar center). */
  x: number;
  /** raw value, shown in the legend. */
  value: number;
  color: string;
  label: string;
  dash: string;
}

function bucketIndexFor(dist: SpecDistribution, value: number): number {
  if (!dist.histogram?.length) return -1;
  for (let i = 0; i < dist.histogram.length; i++) {
    const b = dist.histogram[i];
    if (value >= b.rangeStart && value <= b.rangeEnd) return i;
  }
  if (value < dist.histogram[0].rangeStart) return 0;
  return dist.histogram.length - 1;
}

/** Custom bar: a single bar (height = total count). If compared phones fall
 *  in it, the bar is divided VERTICALLY into side-by-side colored stripes. */
function StripeBar({ x, y, width, height, payload, active }: any) {
  if (!height || height <= 0) return null;
  const comp: string[] = payload?.comp ?? [];
  const isActive = active === payload?.idx;
  const stroke = isActive ? '#0f172a' : undefined;
  const swGap = comp.length > 1 ? 2 : 0;
  if (comp.length === 0) {
    return (
      <rect x={x} y={y} width={width} height={height} rx={3} fill="#cbd5e1" cursor="pointer"
        stroke={stroke} strokeWidth={isActive ? 1.5 : 0} />
    );
  }
  const n = comp.length;
  const sw = (width - swGap * (n - 1)) / n;
  return (
    <g cursor="pointer">
      {comp.map((c, i) => (
        <rect key={i} x={x + i * (sw + swGap)} y={y} width={sw} height={height} rx={3} fill={c}
          stroke={stroke} strokeWidth={isActive ? 1.5 : 0} />
      ))}
    </g>
  );
}

/** Reusable bar block: bars (with vertical stripes for compared phones), markers
 *  legend and a click-to-reveal strip of catalog phones in the selected bar. */
function BarsBlock({
  data,
  markers,
  colors,
  unit,
  decimals,
  refLines,
}: {
  data: BarDatum[];
  markers: ComparedPhoneMarker[];
  colors: Colors;
  unit?: string;
  decimals?: number;
  refLines?: RefLine[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const activePhones = active != null && data[active] ? data[active].phones : [];
  const hasStats = !!refLines && refLines.length > 0;
  const lines = showStats ? refLines : undefined;

  return (
    <div>
      {hasStats && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => setShowStats((s) => !s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              showStats
                ? 'border-slate-800 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showStats ? 'Ocultar estadísticas' : 'Mostrar estadísticas'}
          </button>
        </div>
      )}
      <ResponsiveContainer width="100%" height={230}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          onClick={(state: any) => {
            const idx = state?.activeTooltipIndex;
            if (idx != null) setActive((cur) => (cur === idx ? null : idx));
          }}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#475569' }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={52}
            tickFormatter={(v: any) => (typeof v === 'string' && v.length > 12 ? v.slice(0, 11) + '…' : v)}
          />
          {/* hidden numeric axis used only to place the mean/median/mode reference lines */}
          {lines && lines.length > 0 && (
            <XAxis xAxisId="ref" type="number" domain={[-0.5, data.length - 0.5]} hide />
          )}
          <YAxis tick={{ fontSize: 10, fill: '#475569' }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: '#0000000d' }}
            contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a' }}
            itemStyle={{ color: '#334155' }}
            formatter={(v: any) => [`${Math.round(Number(v))}`, 'Total en catálogo']}
          />
          <Bar dataKey="count" shape={(p: any) => <StripeBar {...p} active={active} />} />
          {lines?.map((r) => (
            <ReferenceLine
              key={r.label}
              xAxisId="ref"
              x={r.x}
              stroke={r.color}
              strokeWidth={2}
              strokeDasharray={r.dash}
              ifOverflow="extendDomain"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-1 flex flex-wrap gap-3 text-xs">
        {markers.map((m) => (
          <span key={m.productId} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: colors[m.productId] ?? '#7c3aed' }} />
            {m.label}: <b>{specValueLabel(m.value, unit, decimals)}</b>
          </span>
        ))}
        {lines?.map((r) => (
          <span key={r.label} className="flex items-center gap-1 text-slate-600">
            <span
              className="inline-block h-0 w-5 border-t-2 border-dashed"
              style={{ borderColor: r.color }}
            />
            {r.label}: <b>{specValueLabel(r.value, unit, decimals)}</b>
          </span>
        ))}
      </div>

      {active != null ? (
        <PhoneStripe
          phones={activePhones}
          unit={unit}
          decimals={decimals}
          title={`Celulares con ${data[active]?.label}${unit ? ' ' + unit : ''}:`}
        />
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          Haz click en una barra para ver los celulares del catálogo de ese grupo.
        </p>
      )}
    </div>
  );
}

/** Per-phone header: value + colored bar (quantitative), check (boolean) or label (categorical). */
function PerPhoneHeader({ dist, colors }: { dist: SpecDistribution; colors: Colors }) {
  const m = dist.markers;
  if (!m.length) return null;

  if (dist.type === 'quantitative') {
    const max = dist.max && dist.max > 0 ? dist.max : 1;
    const decimals = getSpecDef(dist.specKey)?.decimals;
    return (
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${m.length}, minmax(0,1fr))` }}>
        {m.map((p) => {
          const v = typeof p.value === 'number' ? p.value : 0;
          const pct = Math.max(4, Math.min(100, (v / max) * 100));
          const color = colors[p.productId] ?? '#7c3aed';
          return (
            <div key={p.productId}>
              <div className="text-lg font-bold">
                {specValueLabel(p.value, dist.unit, decimals)}
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">{p.label}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (dist.type === 'boolean') {
    return (
      <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${m.length}, minmax(0,1fr))` }}>
        {m.map((p) => (
          <div key={p.productId} className="flex items-center gap-1 text-sm">
            {p.value ? <Check size={16} className="text-green-600" /> : <X size={16} className="text-red-600" />}
            <span className="truncate text-slate-600">{p.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // categorical
  return (
    <div className="mb-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${m.length}, minmax(0,1fr))` }}>
      {m.map((p) => (
        <div key={p.productId}>
          <div className="font-semibold" style={{ color: colors[p.productId] ?? '#7c3aed' }}>
            {(p.value as string) ?? '—'}
          </div>
          <div className="truncate text-xs text-slate-500">{p.label}</div>
        </div>
      ))}
    </div>
  );
}

export function SpecChart({ dist, colors }: { dist: SpecDistribution; colors: Colors }) {
  const [active, setActive] = useState<number | null>(null);
  const def = getSpecDef(dist.specKey);

  // ---------------- QUANTITATIVE: bars (discrete or bucketed histogram) ----------------
  if (dist.type === 'quantitative' && dist.histogram) {
    const decimals = def?.decimals;
    const comparedByBucket: Record<number, string[]> = {};
    dist.markers.forEach((mk) => {
      if (typeof mk.value === 'number') {
        const bi = bucketIndexFor(dist, mk.value);
        (comparedByBucket[bi] ||= []).push(colors[mk.productId] ?? '#7c3aed');
      }
    });
    const data: BarDatum[] = dist.histogram.map((b, i) => ({
      label: b.label,
      count: b.count,
      phones: b.phones ?? [],
      comp: comparedByBucket[i] ?? [],
      idx: i,
    }));

    // Map a raw value to band-index coordinates so the mean/median reference
    // lines land in the right spot (discrete bars and bucketed histograms differ).
    const hist = dist.histogram;
    const isDiscrete = def?.chart === 'bar' || hist.every((b) => b.rangeStart === b.rangeEnd);
    const valueToIdx = (v: number): number => {
      if (isDiscrete) {
        const xs = hist.map((b) => b.rangeStart);
        if (v <= xs[0]) return 0;
        if (v >= xs[xs.length - 1]) return xs.length - 1;
        for (let i = 0; i < xs.length - 1; i++) {
          if (v >= xs[i] && v <= xs[i + 1]) return i + (v - xs[i]) / (xs[i + 1] - xs[i]);
        }
        return xs.length - 1;
      }
      for (let i = 0; i < hist.length; i++) {
        const b = hist[i];
        if (v >= b.rangeStart && v <= b.rangeEnd) {
          const w = b.rangeEnd - b.rangeStart;
          return i + (w > 0 ? (v - b.rangeStart) / w : 0.5) - 0.5;
        }
      }
      return v < hist[0].rangeStart ? -0.5 : hist.length - 0.5;
    };

    // mode = most frequent value (modal bar); discrete -> its exact value,
    // continuous -> center of the modal bucket.
    let modeIdx = -1;
    let modeCount = -1;
    hist.forEach((b, i) => {
      if (b.count > modeCount) {
        modeCount = b.count;
        modeIdx = i;
      }
    });
    const modeBucket = modeIdx >= 0 ? hist[modeIdx] : undefined;
    const modeValue = modeBucket
      ? isDiscrete
        ? modeBucket.rangeStart
        : (modeBucket.rangeStart + modeBucket.rangeEnd) / 2
      : undefined;

    const refLines: RefLine[] = [];
    if (typeof dist.mean === 'number')
      refLines.push({ x: valueToIdx(dist.mean), value: dist.mean, color: '#0f172a', label: 'Media', dash: '6 4' });
    if (typeof dist.median === 'number')
      refLines.push({ x: valueToIdx(dist.median), value: dist.median, color: '#94a3b8', label: 'Mediana', dash: '2 4' });
    if (typeof modeValue === 'number')
      refLines.push({ x: modeIdx, value: modeValue, color: '#0ea5e9', label: 'Moda', dash: '1 4' });

    return (
      <div>
        <PerPhoneHeader dist={dist} colors={colors} />
        <BarsBlock data={data} markers={dist.markers} colors={colors} unit={dist.unit} decimals={decimals} refLines={refLines} />
      </div>
    );
  }

  // ---------------- BOOLEAN: green / red pie (incluido / no lo tiene) ----------------
  if (dist.type === 'boolean') {
    const cats = dist.categories ?? [];
    const si = cats.find((c) => c.category === 'Si');
    const no = cats.find((c) => c.category === 'No');
    const total = dist.total || (si?.count ?? 0) + (no?.count ?? 0) || 1;
    const siPct = Math.round(((si?.count ?? 0) / total) * 100);
    const noPct = 100 - siPct;
    const withSi = dist.markers.filter((m) => m.value === true);
    const withNo = dist.markers.filter((m) => m.value === false);
    const pieData = [
      { name: 'Sí', value: si?.count ?? 0, color: '#22c55e', phones: si?.phones ?? [] },
      { name: 'No', value: no?.count ?? 0, color: '#ef4444', phones: no?.phones ?? [] },
    ];
    const activePhones: CatalogPhoneRef[] =
      active != null && pieData[active] ? pieData[active].phones : [];

    return (
      <div onMouseLeave={() => setActive(null)}>
        <PerPhoneHeader dist={dist} colors={colors} />
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <ResponsiveContainer width="50%" height={200} minWidth={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                onMouseEnter={(_: any, index: number) => setActive(index)}>
                {pieData.map((d, i) => (
                  <Cell key={i} fill={d.color} stroke={active === i ? '#0f172a' : '#ffffff'} strokeWidth={active === i ? 2 : 1} cursor="pointer" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a' }}
                formatter={(v: any, n: any) => [`${v} en catálogo`, n]}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 text-sm">
            <p className="flex items-center gap-2 font-semibold text-green-700">
              <span className="h-3 w-3 rounded-full bg-green-500" /> Incluido en el {siPct}%
            </p>
            <div className="mb-3 mt-1 space-y-0.5 pl-5 text-slate-700">
              {withSi.length ? withSi.map((m) => <p key={m.productId}>{m.label}</p>)
                : <p className="text-slate-400">Ninguno de los comparados</p>}
            </div>
            <p className="flex items-center gap-2 font-semibold text-red-600">
              <span className="h-3 w-3 rounded-full bg-red-500" /> {noPct}% no lo tiene
            </p>
            <div className="mt-1 space-y-0.5 pl-5 text-slate-700">
              {withNo.map((m) => <p key={m.productId}>{m.label}</p>)}
            </div>
          </div>
        </div>

        {active != null && (
          <PhoneStripe phones={activePhones} title={`En venta — ${pieData[active]?.name}:`} />
        )}
      </div>
    );
  }

  // ---------------- CATEGORICAL as BARS (e.g. modelo del procesador) ----------------
  const cats = dist.categories ?? [];
  if (def?.chart === 'bar') {
    const data: BarDatum[] = cats.map((c, i) => ({
      label: c.category,
      count: c.count,
      phones: c.phones ?? [],
      comp: dist.markers.filter((m) => m.value === c.category).map((m) => colors[m.productId] ?? '#7c3aed'),
      idx: i,
    }));
    return (
      <div>
        <PerPhoneHeader dist={dist} colors={colors} />
        <BarsBlock data={data} markers={dist.markers} colors={colors} />
      </div>
    );
  }

  // ---------------- CATEGORICAL: multi-slice pie ----------------
  const total = dist.total || cats.reduce((s, c) => s + c.count, 0) || 1;
  const activeCat = active != null && cats[active] ? cats[active] : null;

  return (
    <div onMouseLeave={() => setActive(null)}>
      <PerPhoneHeader dist={dist} colors={colors} />
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <ResponsiveContainer width="50%" height={220} minWidth={180}>
          <PieChart>
            <Pie data={cats} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={85}
              onMouseEnter={(_: any, index: number) => setActive(index)}>
              {cats.map((_, i) => (
                <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} stroke={active === i ? '#0f172a' : '#ffffff'} strokeWidth={active === i ? 2 : 1} cursor="pointer" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a' }}
              formatter={(v: any, n: any) => [`${v} en catálogo`, n]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-1 text-sm">
          {cats.map((c, i) => {
            const inThis = dist.markers.filter((m) => m.value === c.category);
            return (
              <div key={c.category}>
                <p className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                  <span className="font-medium">{c.category}</span>
                  <span className="text-slate-400">{Math.round((c.count / total) * 100)}%</span>
                </p>
                {inThis.length > 0 && (
                  <div className="pl-5 text-xs text-slate-500">
                    {inThis.map((m) => m.label).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {activeCat && (
        <PhoneStripe phones={activeCat.phones ?? []} unit={dist.unit} title={`En venta — ${activeCat.category}:`} />
      )}
    </div>
  );
}
