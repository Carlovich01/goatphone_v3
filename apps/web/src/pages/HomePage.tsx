import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ProductSummary } from '@goatphone/shared';
import { api } from '@/lib/api';
import { Button, Spinner } from '@/components/ui';
import { ProductCard } from '@/components/ProductCard';
import { GitCompare, Sparkles, ShieldCheck } from 'lucide-react';

export function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['catalog', 'top'],
    queryFn: () => api.get<ProductSummary[]>('/catalog?sort=score'),
  });

  const top = (data ?? []).slice(0, 8);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand/20 via-white to-white p-8 sm:p-12">
        <div className="flex items-center justify-between gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold sm:text-5xl">
              Elegí el celular <span className="text-brand-dark">GOAT</span>
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Compará especificaciones con puntajes objetivos, gráficos interactivos y un asistente con
              IA. Encontrá el mejor teléfono según su rendimiento, cámara, batería y precio.
            </p>
          </div>
          <img
            src="/logo.png"
            alt="GoatPhone"
            className="hidden w-36 sm:block sm:w-44 lg:w-52 drop-shadow-xl"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/catalog">
            <Button variant="primary">Ver catálogo</Button>
          </Link>
          <Link to="/compare">
            <Button variant="outline">
              <GitCompare size={18} /> Comparar celulares
            </Button>
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Feature icon={<GitCompare className="text-brand-dark" />} title="Comparación inteligente"
            text="Puntaje por celular según sus especificaciones." />
          <Feature icon={<Sparkles className="text-brand-dark" />} title="Resumen con IA"
            text="Análisis automático y un chat para recomendaciones personalizadas." />
          <Feature icon={<ShieldCheck className="text-brand-dark" />} title="Pago seguro"
            text="Checkout con Mercado Pago." />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Top según puntaje GOAT</h2>
        {isLoading ? (
          <Spinner label="Cargando catálogo…" />
        ) : top.length === 0 ? (
          <p className="text-slate-500">
            Todavía no hay celulares en el catálogo. Iniciá sesión como administrador para agregarlos.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {top.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2">{icon}</div>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}
