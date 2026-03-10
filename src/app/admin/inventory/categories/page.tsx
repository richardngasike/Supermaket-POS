'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit, Tag, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#00d4aa' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get('/categories');
    setCategories(data.categories);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditCat(null); setForm({ name: '', description: '', color: '#00d4aa' }); setShowModal(true); };
  const openEdit = (c: any) => { setEditCat(c); setForm({ name: c.name, description: c.description || '', color: c.color }); setShowModal(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editCat) { await api.put(`/categories/${editCat.id}`, form); toast.success('Category updated'); }
      else { await api.post('/categories', form); toast.success('Category created'); }
      setShowModal(false); load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2 style={{ fontSize: 20, fontWeight: 700 }}>Categories</h2></div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} />Add Category</button>
      </div>
      <div className="page-body">
        <div className="grid-3">
          {categories.map(c => (
            <div key={c.id} className="card" style={{ borderLeft: `4px solid ${c.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.color }} />
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{c.description}</p>
                  <span className="badge badge-info">{c.product_count} products</span>
                </div>
                <button className="btn-icon" onClick={() => openEdit(c)}><Edit size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title">{editCat ? 'Edit Category' : 'New Category'}</span>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Category name" /></div>
                <div className="form-group"><label className="form-label">Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 60, height: 40, padding: 4 }} />
                    <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="#000000" style={{ flex: 1 }} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
