import { Link } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCompare } from '@/store/compare';
import { ComparisonView } from '@/features/comparison/ComparisonView';

export function ComparePage() {
  const { ids } = useCompare();

  if (ids.length === 0) {
    return (
      <div className="py-16 text-center">
        <GitCompare className="mx-auto mb-4 text-slate-400" size={48} />
        <h1 className="text-2xl font-bold">Comparador de celulares</h1>
        <p className="mt-2 text-slate-500">
          Agregá celulares desde el catálogo (hasta 4) para compararlos.
        </p>
        <Link to="/catalog">
          <Button variant="primary" className="mt-4">Ir al catálogo</Button>
        </Link>
      </div>
    );
  }

  return <ComparisonView ids={ids} managed />;
}
