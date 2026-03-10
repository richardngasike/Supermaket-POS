'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit, Key, X, UserCheck, UserX } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

const ROLES = ['admin', 'manager', 'supervisor', 'cashier'];
const roleBadge: Record<string, string> = { admin: 'badge-danger', manager: 'badge-purple', supervisor: 'badge-warning', cashier: 'badge-accent' };

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [pwdUser, setPwdUser] = useState<any>(null);
  const [newPwd, setNewPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '', role: 'cashier', phone: '' });

  const load = async () => { const { data } = await api.get('/users'); setUsers(data.users); };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditUser(null); setForm({ username: '', full_name: '', email: '', password: '', role: 'cashier', phone: '' }); setShowModal(true); };
  const openEdit = (u: any) => { setEditUser(u); setForm({ username: u.username, full_name: u.full_name, email: u.email || '', password: '', role: u.role, phone: u.phone || '' }); setShowModal(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUser) { await api.put(`/users/${editUser.id}`, { full_name: form.full_name, email: form.email, role: form.role, phone: form.phone }); toast.success('User updated'); }
      else { await api.post('/users', form); toast.success('User created'); }
      setShowModal(false); load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const resetPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPwd || newPwd.length < 6) { toast.error('Min 6 characters'); return; }
    try { await api.post(`/users/${pwdUser.id}/reset-password`, { new_password: newPwd }); toast.success('Password reset'); setShowPwdModal(false); setNewPwd(''); }
    catch { toast.error('Failed'); }
  };

  const toggleActive = async (u: any) => {
    try { await api.put(`/users/${u.id}`, { is_active: !u.is_active }); toast.success('Updated'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2 style={{ fontSize: 20, fontWeight: 700 }}>User Management</h2><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{users.length} users</p></div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} />Add User</button>
      </div>
      <div className="page-body">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                  <td><span className="mono" style={{ fontSize: 13 }}>{u.username}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.email || '—'}</td>
                  <td style={{ fontSize: 13 }}>{u.phone || '—'}</td>
                  <td><span className={`badge ${roleBadge[u.role] || 'badge-info'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" title="Edit" onClick={() => openEdit(u)}><Edit size={14} /></button>
                      <button className="btn-icon" title="Reset Password" onClick={() => { setPwdUser(u); setShowPwdModal(true); }}><Key size={14} /></button>
                      <button className="btn-icon" title={u.is_active ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(u)}>
                        {u.is_active ? <UserX size={14} color="var(--danger)" /> : <UserCheck size={14} color="var(--success)" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><span className="modal-title">{editUser ? 'Edit User' : 'Add User'}</span><button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Full Name *</label><input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" /></div>
                  <div className="form-group"><label className="form-label">Username *</label><input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="johndoe" disabled={!!editUser} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" /></div>
                  <div className="form-group"><label className="form-label">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07XXXXXXXX" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Role *</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </div>
                  {!editUser && <div className="form-group"><label className="form-label">Password *</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" /></div>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editUser ? 'Update' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPwdModal && pwdUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPwdModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header"><span className="modal-title">Reset Password</span><button className="btn-icon" onClick={() => setShowPwdModal(false)}><X size={18} /></button></div>
            <form onSubmit={resetPwd}>
              <div className="modal-body">
                <p style={{ marginBottom: 16, fontSize: 14 }}>Reset password for: <strong>{pwdUser.full_name}</strong></p>
                <div className="form-group"><label className="form-label">New Password</label><input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min 6 characters" autoFocus /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPwdModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
