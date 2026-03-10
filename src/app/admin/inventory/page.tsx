'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Package, RefreshCw, X, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatKES } from '@/lib/format';
import toast from 'react-hot-toast';

interface Product { id: string; name: string; barcode: string; category_name: string; selling_price: number; buying_price: number; quantity: number; min_stock_level: number; unit: string; vat_rate: number; is_active: boolean; }
interface Category { id: string; name: string; color: string; }

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', barcode: '', category_id: '', buying_price: '', selling_price: '', quantity: '', min_stock_level: '5', unit: 'piece', description: '', vat_rate: '16' });

  const loadData = useCallback(async () => {
    try {
      const params: any = { active: 'true' };
      if (selectedCat) params.category = selectedCat;
      if (search) params.search = search;
      const [pRes, cRes] = await Promise.all([api.get('/products', { params }), api.get('/categories')]);
      setProducts(pRes.data.products);
      setCategories(cRes.data.categories);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [search, selectedCat]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', barcode: '', category_id: '', buying_price: '', selling_price: '', quantity: '', min_stock_level: '5', unit: 'piece', description: '', vat_rate: '16' });
    setShowModal(true);
  };
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, barcode: p.barcode || '', category_id: '', buying_price: String(p.buying_price), selling_price: String(p.selling_price), quantity: String(p.quantity), min_stock_level: String(p.min_stock_level), unit: p.unit, description: '', vat_rate: String(p.vat_rate) });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.selling_price) { toast.error('Name and selling price required'); return; }
    setSaving(true);
    try {
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, { ...form, buying_price: parseFloat(form.buying_price), selling_price: parseFloat(form.selling_price), min_stock_level: parseInt(form.min_stock_level), vat_rate: parseFloat(form.vat_rate) });
        toast.success('Product updated');
      } else {
        await api.post('/products', { ...form, buying_price: parseFloat(form.buying_price) || 0, selling_price: parseFloat(form.selling_price), quantity: parseInt(form.quantity) || 0, min_stock_level: parseInt(form.min_stock_level), vat_rate: parseFloat(form.vat_rate) });
        toast.success('Product created');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockQty || parseInt(restockQty) <= 0) { toast.error('Enter valid quantity'); return; }
    try {
      await api.post(`/products/${restockProduct!.id}/restock`, { quantity: parseInt(restockQty) });
      toast.success('Stock updated');
      setShowRestock(false);
      setRestockQty('');
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggleActive = async (p: Product) => {
    try {
      await api.put(`/products/${p.id}`, { is_active: !p.is_active });
      toast.success(`Product ${p.is_active ? 'deactivated' : 'activated'}`);
      loadData();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Inventory</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{products.length} products</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} />Add Product</button>
      </div>
      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="search-input-wrap" style={{ maxWidth: 300 }}>
            <Search size={16} /><input placeholder="Search products or barcode..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} style={{ width: 180 }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Buy Price</th>
                <th>Sell Price</th>
                <th>Stock</th>
                <th>VAT</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><div className="loading"><div className="spinner" /></div></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><Package size={32} /><p>No products found</p></div></td></tr>
              ) : products.map(p => (
                <tr key={p.id}>
                  <td><span style={{ fontWeight: 500 }}>{p.name}</span></td>
                  <td><span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.barcode || '—'}</span></td>
                  <td><span className="badge badge-info">{p.category_name || '—'}</span></td>
                  <td className="mono">{formatKES(p.buying_price)}</td>
                  <td className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatKES(p.selling_price)}</td>
                  <td>
                    <span className={`badge ${p.quantity === 0 ? 'badge-danger' : p.quantity <= p.min_stock_level ? 'badge-warning' : 'badge-success'}`}>
                      {p.quantity} {p.unit}
                    </span>
                  </td>
                  <td><span style={{ fontSize: 12 }}>{p.vat_rate}%</span></td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" title="Edit" onClick={() => openEdit(p)}><Edit size={14} /></button>
                      <button className="btn-icon" title="Restock" onClick={() => { setRestockProduct(p); setShowRestock(true); }}><RefreshCw size={14} /></button>
                      <button className="btn-icon" title={p.is_active ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(p)}>
                        {p.is_active ? <XCircle size={14} color="var(--danger)" /> : <CheckCircle size={14} color="var(--success)" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editProduct ? 'Edit Product' : 'Add New Product'}</span>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pembe Maize Flour 2kg" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Barcode</label>
                    <input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Scan or type barcode" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Buying Price (KES)</label>
                    <input type="number" value={form.buying_price} onChange={e => setForm(f => ({ ...f, buying_price: e.target.value }))} placeholder="0.00" min="0" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (KES) *</label>
                    <input type="number" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} placeholder="0.00" min="0" step="0.01" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Initial Quantity</label>
                    <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" min="0" disabled={!!editProduct} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Stock Level</label>
                    <input type="number" value={form.min_stock_level} onChange={e => setForm(f => ({ ...f, min_stock_level: e.target.value }))} placeholder="5" min="0" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                      {['piece','kg','litre','gram','ml','bottle','pack','tray','dozen','roll','box','bag'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">VAT Rate (%)</label>
                    <select value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: e.target.value }))}>
                      <option value="0">0% (Zero-rated)</option>
                      <option value="16">16% (Standard)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editProduct ? 'Update' : 'Create Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestock && restockProduct && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRestock(false)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">Restock Product</span>
              <button className="btn-icon" onClick={() => setShowRestock(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleRestock}>
              <div className="modal-body">
                <p style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>{restockProduct.name}</p>
                <p style={{ marginBottom: 16, fontSize: 13 }}>Current stock: <strong style={{ color: 'var(--accent)' }}>{restockProduct.quantity} {restockProduct.unit}</strong></p>
                <div className="form-group">
                  <label className="form-label">Quantity to Add</label>
                  <input type="number" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="Enter quantity" min="1" autoFocus />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRestock(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
