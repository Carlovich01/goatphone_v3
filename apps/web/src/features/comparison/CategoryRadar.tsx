import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PhoneScore, Product, SPEC_CATEGORIES } from '@goatphone/shared';
import { Card } from '@/components/ui';
import { PHONE_COLORS } from './SpecChart';

const SHORT: Record<string, string> = {
  Rendimiento: 'Rendim.',
  Almacenamiento: 'Almac.',
  Bateria: 'Batería',
  Pantalla: 'Pantalla',
  Camara: 'Cámara',
  Conectividad: 'Conect.',
  'Economía': 'Economía',
};

export function CategoryRadar({ products, scores }: { products: Product[]; scores: PhoneScore[] }) {
  const scoreById = new Map(scores.map((s) => [s.productId, s]));

  // one row per category (axis), with a value key per phone
  const data = SPEC_CATEGORIES.map((cat) => {
    const row: any = { category: SHORT[cat] ?? cat };
    products.forEach((p) => {
      const c = scoreById.get(p.id)?.categories.find((x) => x.category === cat);
      row[`s${p.id}`] = c ? c.score : 0;
    });
    return row;
  });

  return (
    <Card>
      <h3 className="mb-2 font-semibold">Puntaje por categoría</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: '#475569' }} />
          <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={{ fontSize: 9, fill: '#94a3b8' }} angle={90} />
          {products.map((p, i) => {
            const color = PHONE_COLORS[i % PHONE_COLORS.length];
            return (
              <Radar
                key={p.id}
                name={`${p.brand} ${p.model}`}
                dataKey={`s${p.id}`}
                stroke={color}
                fill={color}
                fillOpacity={0.2}
              />
            );
          })}
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a' }}
            itemStyle={{ color: '#334155' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}
