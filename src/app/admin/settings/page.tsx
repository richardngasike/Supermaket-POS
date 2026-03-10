'use client';
import { useState } from 'react';
import { Key, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { getUser } from '@/lib/auth';

export default function SettingsPage() {
  const user = getUser();
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await api.put('/auth/change-password', { current_password: pwdForm.current_password, new_password: pwdForm.new_password });
      toast.success('Password changed!');
      setPwdForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header"><div><h2 style={{ fontSize: 20, fontWeight: 700 }}>Settings</h2></div></div>
      <div className="page-body">
        <div style={{ maxWidth: 560 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><span className="card-title">My Profile</span></div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Full Name</p><p>{user?.full_name}</p></div>
              <div><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Username</p><p className="mono">{user?.username}</p></div>
              <div><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Role</p><p style={{ textTransform: 'capitalize' }}>{user?.role}</p></div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title"><Key size={16} /> Change Password</span></div>
            <form onSubmit={changePassword}>
              <div className="form-group"><label className="form-label">Current Password</label><input type="password" value={pwdForm.current_password} onChange={e => setPwdForm(f => ({ ...f, current_password: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">New Password</label><input type="password" value={pwdForm.new_password} onChange={e => setPwdForm(f => ({ ...f, new_password: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Confirm New Password</label><input type="password" value={pwdForm.confirm} onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} /></div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Change Password'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
