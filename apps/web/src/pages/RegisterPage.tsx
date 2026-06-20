import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { Button, Card, Input } from '@/components/ui';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <h1 className="mb-1 text-2xl font-bold">Crear cuenta</h1>
        <p className="mb-4 text-sm text-slate-500">Registrate como cliente para comprar.</p>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Contraseña (mín. 6)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-brand-dark">Ingresá</Link>
        </p>
      </Card>
    </div>
  );
}
