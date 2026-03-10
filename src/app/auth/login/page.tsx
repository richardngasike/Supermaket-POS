'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ShoppingCart, Eye, EyeOff, LogIn } from 'lucide-react';
import api from '@/lib/api';
import { setAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) { 
      toast.error('Enter username and password'); 
      return; 
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.token, data.user);
      toast.success(`Welcome, ${data.user.full_name}!`);
      if (['admin','manager','supervisor'].includes(data.user.role)) {
        router.push('/admin');
      } else {
        router.push('/cashier/sell');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="login-page"
      style={{
        minHeight: '100vh',
        backgroundImage: 'url(/loginbg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
    
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          zIndex: 1,
        }}
      />

      <div style={{ 
        position: 'relative', 
        zIndex: 2,
        width: '100%',
        maxWidth: '420px',  
        padding: '20px',
      }}>
        <div className="login-card">
          <div className="login-logo">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #00d4aa, #7c3aed)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <ShoppingCart size={32} color="#fff" />

              </div>
            </div>
            <h1>NaretuPOS</h1>
            <p>Kenya's Modern Point of Sale System</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPwd(v => !v)}
                  style={{ 
                    position: 'absolute', 
                    right: 12, 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: 'var(--text-muted)' 
                  }}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full btn-lg" 
              disabled={loading} 
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 18, height: 18 }} />&nbsp;Signing in...</>
              ) : (
                <><LogIn size={18} /> Sign In</>
              )}
            </button>
          </form>
        </div>

        <p style={{ 
          textAlign: 'center', 
          marginTop: 16, 
          fontSize: 12, 
          color: 'var(--text-muted)' 
        }}>
          &copy; 2026 SupermarketPOS Kenya. All rights reserved.
        </p>
      </div>
    </div>
  );
}