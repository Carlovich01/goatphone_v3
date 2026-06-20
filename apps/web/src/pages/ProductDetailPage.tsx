import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { ComparisonView } from '@/features/comparison/ComparisonView';

export function ProductDetailPage() {
  const { id } = useParams();
  const numId = Number(id);

  if (!id || Number.isNaN(numId)) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">Celular no válido</h1>
        <Link to="/catalog">
          <Button variant="primary" className="mt-4">Volver al catálogo</Button>
        </Link>
      </div>
    );
  }

  // Same versus-style layout as the comparison view, with a single phone.
  return <ComparisonView ids={[numId]} />;
}
