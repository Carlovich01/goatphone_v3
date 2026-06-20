import { useQuery } from '@tanstack/react-query';
import { AiSummary } from '@goatphone/shared';
import { api } from '@/lib/api';
import { Card, Spinner, Badge } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { Sparkles } from 'lucide-react';

// Persist the AI summary per comparison set so that, while the set of phones is
// unchanged, no new request is made (not even after remount or page reload).
const TTL_MS = 24 * 60 * 60 * 1000; // hygiene bound only; cache key is the phone set

function storageKey(sortedIds: number[]) {
  return `gp_ai_summary:${sortedIds.join(',')}`;
}

function readCache(sortedIds: number[]): AiSummary | undefined {
  try {
    const raw = localStorage.getItem(storageKey(sortedIds));
    if (!raw) return undefined;
    const { value, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL_MS) return undefined;
    return value as AiSummary;
  } catch {
    return undefined;
  }
}

function writeCache(sortedIds: number[], value: AiSummary) {
  try {
    localStorage.setItem(storageKey(sortedIds), JSON.stringify({ value, ts: Date.now() }));
  } catch {
    /* ignore quota errors */
  }
}

export function SummaryPanel({ ids }: { ids: number[] }) {
  // normalize: the cache key is the SET of phones, independent of selection order
  const sortedIds = [...ids].sort((a, b) => a - b);
  const key = sortedIds.join(',');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ai-summary', key],
    queryFn: async () => {
      const res = await api.post<AiSummary>('/ai/summary', { ids: sortedIds });
      writeCache(sortedIds, res);
      return res;
    },
    enabled: ids.length >= 1,
    // serve from localStorage on mount/reload; treat as fresh so it won't refetch
    initialData: () => readCache(sortedIds),
    staleTime: Infinity,
    gcTime: TTL_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <Card className="border-brand/40 bg-gradient-to-br from-brand/10 to-white">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="text-brand-dark" size={18} />
        <h3 className="font-semibold">Análisis por IA</h3>
        {data?.cached && <Badge className="bg-slate-200 text-slate-600">cache</Badge>}
      </div>

      {isLoading ? (
        <Spinner label="Generando análisis…" />
      ) : isError ? (
        <p className="text-sm text-slate-500">No se pudo generar el análisis.</p>
      ) : data ? (
        <Markdown
          text={data.summary}
          className="space-y-2 text-sm leading-relaxed text-slate-700"
        />
      ) : null}
    </Card>
  );
}
