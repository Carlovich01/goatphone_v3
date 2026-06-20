import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserProfile } from '@goatphone/shared';
import { api } from '@/lib/api';
import { Button, Card, Input, Spinner } from '@/components/ui';

export function AccountPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<UserProfile>('/users/me'),
  });

  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (data) {
      setDni(data.dni ?? '');
      setPhone(data.phone ?? '');
      setAddress(data.address ?? '');
    }
  }, [data]);

  if (isLoading) return <Spinner label="Cargando datos…" />;

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.patch('/users/me', { dni, phone, address });
      setMsg('Datos guardados.');
      refetch();
    } catch (e: any) {
      setMsg(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Mi cuenta</h1>
      <Card>
        <p className="mb-1 text-sm text-slate-500">{data?.name}</p>
        <p className="mb-4 text-sm text-slate-500">{data?.email}</p>

        <p className="mb-3 text-sm text-slate-600">
          Completá estos datos para poder pagar. El <b>DNI</b> y el <b>teléfono</b> son
          obligatorios para retiro en local y envío; la <b>dirección</b> es necesaria
          para envío a domicilio.
        </p>

        <label className="text-xs text-slate-500">DNI</label>
        <Input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Ej: 40123456" />

        <label className="mt-3 block text-xs text-slate-500">Teléfono</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: +54 9 11 1234-5678" />

        <label className="mt-3 block text-xs text-slate-500">Dirección de envío</label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Calle, número, ciudad, provincia, CP"
        />

        <div className="mt-4 flex items-center gap-3">
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar datos'}
          </Button>
          {msg && <span className="text-sm text-brand-dark">{msg}</span>}
        </div>
      </Card>
    </div>
  );
}
