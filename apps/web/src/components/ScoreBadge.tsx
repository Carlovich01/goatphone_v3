import { scoreColor } from '@/lib/format';

export function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const color = scoreColor(score);
  const dims = size === 'lg' ? 'h-16 w-16 text-xl' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-12 w-12 text-sm';
  return (
    <div
      className={`flex ${dims} flex-col items-center justify-center rounded-full font-bold`}
      style={{ background: `${color}22`, color, border: `2px solid ${color}` }}
      title={`Puntaje GOAT: ${score}/100`}
    >
      {Math.round(score)}
    </div>
  );
}
