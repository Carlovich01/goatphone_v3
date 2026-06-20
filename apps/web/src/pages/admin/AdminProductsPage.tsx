import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Trash2, Save, RefreshCw, Tag } from 'lucide-react';
import { DatasetPhone, Product, isOfferActive } from '@goatphone/shared';
import { api } from '@/lib/api';
import { Button, Card, Input, Spinner } from '@/components/ui';
import { formatArs } from '@/lib/format';

interface DatasetRow extends DatasetPhone {}

export function AdminProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<DatasetRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<DatasetRow | null>(null);
  const [form, setForm] = useState({ priceArs: '', stock: '', imageUrl: '', description: '' });
  const [msg, setMsg] = useState('');

  const products = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.get<Product[]>('/catalog/admin/all'),
  });

  const search = async () => {
    setSearching(true);
    try {
      setResults(await api.get<DatasetRow[]>(`/dataset/search?q=${encodeURIComponent(q)}`));
    } finally {
      setSearching(false);
    }
  };

  const submitAdd = async () => {
    if (!adding) return;
    setMsg('');
    try {
      await api.post('/catalog', {
        datasetPhoneId: adding.id,
        priceArs: Number(form.priceArs),
        stock: Number(form.stock),
        imageUrl: form.imageUrl || undefined,
        description: form.description || undefined,
      });
      setAdding(null);
      setForm({ priceArs: '', stock: '', imageUrl: '', description: '' });
      setMsg('Celular agregado al catálogo.');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (e: any) {
      setMsg(e.message || 'Error al agregar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Dataset search */}
      <Card>
        <h2 className="mb-2 font-semibold">Agregar celular al catálogo</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Ej: Galaxy S25, Poco, iPhone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button variant="primary" onClick={search} disabled={searching}>
            <Search size={16} /> Buscar
          </Button>
        </div>

        {searching ? (
          <Spinner />
        ) : results.length > 0 ? (
          <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-slate-500">
                <tr>
                  <th className="p-2">Marca</th>
                  <th className="p-2">Modelo</th>
                  <th className="p-2">RAM</th>
                  <th className="p-2">Bat.</th>
                  <th className="p-2">Cámara</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200">
                    <td className="p-2">{r.brand}</td>
                    <td className="p-2">{r.model}</td>
                    <td className="p-2">{r.ram ?? '—'}GB</td>
                    <td className="p-2">{r.batteryCapacity ?? '—'}mAh</td>
                    <td className="p-2">{r.primaryRearMp ?? '—'}MP</td>
                    <td className="p-2">
                      <Button variant="outline" className="px-2 py-1" onClick={() => { setAdding(r); setMsg(''); setResults([]); }}>
                        <Plus size={14} /> Agregar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {msg && <p className="mt-2 text-sm text-brand-dark">{msg}</p>}
      </Card>

      {/* Add form */}
      {adding && (
        <Card className="border-brand/50">
          <h3 className="mb-2 font-semibold">
            Agregar al catálogo: {adding.brand} {adding.model}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-slate-500">Precio (ARS)</label>
              <Input autoFocus type="number" value={form.priceArs} onChange={(e) => setForm({ ...form, priceArs: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Stock</label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500">URL de imagen</label>
              <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500">Descripción</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" onClick={submitAdd} disabled={!form.priceArs || !form.stock}>
              <Save size={16} /> Guardar
            </Button>
            <Button variant="ghost" onClick={() => setAdding(null)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {/* Existing products */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Catálogo actual</h2>
          <Button variant="ghost" onClick={() => products.refetch()}>
            <RefreshCw size={16} /> Actualizar
          </Button>
        </div>
        {products.isLoading ? (
          <Spinner />
        ) : (products.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">Aún no agregaste celulares.</p>
        ) : (
          <div className="space-y-2">
            {products.data!.map((p) => (
              <ProductRow key={p.id} product={p} onChange={() => qc.invalidateQueries({ queryKey: ['admin-products'] })} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/** ISO string -> value for a <input type="datetime-local"> (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function ProductRow({ product, onChange }: { product: Product; onChange: () => void }) {
  const [price, setPrice] = useState(String(product.priceArs));
  const [stock, setStock] = useState(String(product.stock));
  const [active, setActive] = useState(product.isActive);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // temporary offer
  const [offerPrice, setOfferPrice] = useState(product.offerPriceArs != null ? String(product.offerPriceArs) : '');
  const [offerEnds, setOfferEnds] = useState(toLocalInput(product.offerEndsAt));
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerErr, setOfferErr] = useState('');

  // unsaved-changes detection: any field differs from the persisted value
  const dirty =
    price !== String(product.priceArs) ||
    stock !== String(product.stock) ||
    active !== product.isActive;

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/catalog/${product.id}`, {
        priceArs: Number(price),
        stock: Number(stock),
        isActive: active,
      });
      onChange();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = window.confirm(
      `¿Seguro que querés borrar "${product.brand} ${product.model}" del catálogo? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    setRemoving(true);
    try {
      await api.delete(`/catalog/${product.id}`);
      onChange();
    } finally {
      setRemoving(false);
    }
  };

  const applyOffer = async () => {
    setOfferErr('');
    setOfferBusy(true);
    try {
      await api.patch(`/catalog/${product.id}/offer`, {
        offerPriceArs: Number(offerPrice),
        offerEndsAt: new Date(offerEnds).toISOString(),
      });
      onChange();
    } catch (e: any) {
      setOfferErr(e.message || 'Error al aplicar la oferta');
    } finally {
      setOfferBusy(false);
    }
  };

  const removeOffer = async () => {
    setOfferBusy(true);
    try {
      await api.delete(`/catalog/${product.id}/offer`);
      setOfferPrice('');
      setOfferEnds('');
      onChange();
    } finally {
      setOfferBusy(false);
    }
  };

  const hasOffer = product.offerPriceArs != null;

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-2 text-sm">
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.model} className="h-full w-full object-contain p-1" />
        ) : (
          <span className="text-[10px] text-slate-400">—</span>
        )}
      </div>
      <div className="min-w-[140px] flex-1">
        <p className="text-xs text-slate-500">{product.brand}</p>
        <p className="font-medium">{product.model}</p>
        <p className="text-xs text-slate-500">{formatArs(product.priceArs)}</p>
      </div>
      <label className="text-xs text-slate-500">
        Precio
        <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-28" />
      </label>
      <label className="text-xs text-slate-500">
        Stock
        <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-20" />
      </label>
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Activo
      </label>
      {dirty && (
        <span className="flex items-center gap-1 text-xs font-medium text-amber-600" title="Tenés cambios sin guardar">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Sin guardar
        </span>
      )}
      <Button
        variant={dirty ? 'primary' : 'outline'}
        className="px-2 py-1"
        onClick={save}
        disabled={saving || !dirty}
        title={dirty ? 'Guardar cambios' : 'Sin cambios para guardar'}
      >
        <Save size={14} /> {saving ? 'Guardando…' : 'Guardar'}
      </Button>
      <Button variant="danger" className="px-2 py-1" onClick={remove} disabled={removing} title="Borrar del catálogo">
        <Trash2 size={14} />
      </Button>
    </div>

    {/* temporary offer */}
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-2">
      <span className="flex items-center gap-1 text-xs font-medium text-green-700">
        <Tag size={14} /> Oferta temporal
      </span>
      <label className="text-xs text-slate-500">
        Precio oferta
        <Input
          type="number"
          value={offerPrice}
          onChange={(e) => setOfferPrice(e.target.value)}
          placeholder="menor al normal"
          className="w-28"
        />
      </label>
      <label className="text-xs text-slate-500">
        Hasta
        <Input
          type="datetime-local"
          value={offerEnds}
          onChange={(e) => setOfferEnds(e.target.value)}
          className="w-52"
        />
      </label>
      <Button
        variant="primary"
        className="px-2 py-1"
        onClick={applyOffer}
        disabled={offerBusy || !offerPrice || !offerEnds}
      >
        {offerBusy ? 'Guardando…' : 'Aplicar oferta'}
      </Button>
      {hasOffer && (
        <Button variant="outline" className="px-2 py-1" onClick={removeOffer} disabled={offerBusy}>
          Quitar oferta
        </Button>
      )}
      {isOfferActive(product) ? (
        <span className="text-xs font-medium text-green-700">
          Activa hasta {new Date(product.offerEndsAt!).toLocaleString('es-AR')}
        </span>
      ) : hasOffer ? (
        <span className="text-xs text-slate-400">Oferta vencida</span>
      ) : null}
      {offerErr && <span className="text-xs text-red-600">{offerErr}</span>}
    </div>
    </div>
  );
}
