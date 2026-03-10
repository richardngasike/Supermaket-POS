'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import api from '@/lib/api';
import { formatKES } from '@/lib/format';
import toast from 'react-hot-toast';

export default function LowStockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restocking, setRestocking] = useState<any>(null);
  const [qty, setQty] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/products/low-stock');
    setProducts(data.products);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const doRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/products/${restocking.id}/restock`, { quantity: parseInt(qty) });
      toast.success('Restocked!'); setRestocking(null); setQty(''); load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2 style={{ fontSize: 20, fontWeight: 700 }}>Low Stock Alert</h2><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{products.length} items need restocking</p></div>
        <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14} />Refresh</button>
      </div>
      <div className="page-body">
        {loading ? <div className="loading"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Current Stock</th><th>Min Level</th><th>Sell Price</th><th>Action</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.category_name || '—'}</td>
                    <td><span className={`badge ${p.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>{p.quantity} {p.unit}</span></td>
                    <td>{p.min_stock_level}</td>
                    <td className="mono">{formatKES(p.selling_price)}</td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => setRestocking(p)}><RefreshCw size={12} />Restock</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {restocking && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRestocking(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header"><span className="modal-title">Restock</span><button className="btn-icon" onClick={() => setRestocking(null)}><X size={18} /></button></div>
            <form onSubmit={doRestock}>
              <div className="modal-body">
                <p style={{ marginBottom: 12, fontWeight: 500 }}>{restocking.name}</p>
                <p style={{ fontSize: 13, marginBottom: 16 }}>Current: <strong style={{ color: 'var(--warning)' }}>{restocking.quantity}</strong></p>
                <div className="form-group"><label className="form-label">Quantity to Add</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} min="1" autoFocus /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRestocking(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
