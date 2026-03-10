'use client';
import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, ShoppingCart, Package, Users, AlertTriangle, DollarSign, CreditCard, Smartphone } from 'lucide-react';
import api from '@/lib/api';
import { formatKES, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = useCallback(async () => {
    try {
      const [sumRes, salesRes, stockRes] = await Promise.all([
        api.get(`/sales/summary?date=${date}`),
        api.get('/sales?limit=8'),
        api.get('/products/low-stock'),
      ]);
      setSummary(sumRes.data.summary);
      setRecentSales(salesRes.data.sales);
      setLowStock(stockRes.data.products.slice(0, 6));
    } catch { toast.error('Failed to load dashboard'); } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const s = summary || {};
  const pmBadge: Record<string, string> = { cash: 'badge-success', mpesa: 'badge-accent', card: 'badge-purple' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Dashboard</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Sales overview and key metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn btn-primary btn-sm" onClick={loadData}>Refresh</button>
        </div>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card green">
            <div className="stat-icon" style={{ background: 'rgba(0,212,170,0.1)' }}><TrendingUp size={20} color="var(--accent)" /></div>
            <div className="stat-value text-accent">{formatKES(s.total_revenue || 0)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)' }}><ShoppingCart size={20} color="#60a5fa" /></div>
            <div className="stat-value" style={{ color: '#60a5fa' }}>{s.total_transactions || 0}</div>
            <div className="stat-label">Total Transactions</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.1)' }}><DollarSign size={20} color="var(--success)" /></div>
            <div className="stat-value text-success">{formatKES(s.cash_total || 0)}</div>
            <div className="stat-label">Cash Revenue <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({s.cash_count || 0} txns)</span></div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon" style={{ background: 'rgba(0,212,170,0.1)' }}><Smartphone size={20} color="var(--accent)" /></div>
            <div className="stat-value text-accent">{formatKES(s.mpesa_total || 0)}</div>
            <div className="stat-label">M-Pesa Revenue <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({s.mpesa_count || 0} txns)</span></div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.1)' }}><CreditCard size={20} color="#a78bfa" /></div>
            <div className="stat-value" style={{ color: '#a78bfa' }}>{formatKES(s.card_total || 0)}</div>
            <div className="stat-label">Card Revenue <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({s.card_count || 0} txns)</span></div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)' }}><Package size={20} color="var(--warning)" /></div>
            <div className="stat-value text-warning">{lowStock.length}</div>
            <div className="stat-label">Low Stock Items</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Sales</span>
            </div>
            {recentSales.length === 0 ? (
              <div className="empty-state"><ShoppingCart size={32} /><p>No sales yet</p></div>
            ) : (
              recentSales.map(sale => (
                <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{sale.receipt_number}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sale.cashier_name} • {formatDate(sale.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14, fontFamily: 'JetBrains Mono, monospace' }}>{formatKES(sale.total_amount)}</div>
                    <span className={`badge ${pmBadge[sale.payment_method] || 'badge-info'}`}>{sale.payment_method}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Low Stock Alert</span>
              <span className="badge badge-warning"><AlertTriangle size={10} />{lowStock.length}</span>
            </div>
            {lowStock.length === 0 ? (
              <div className="empty-state"><Package size={32} /><p>All stock levels OK</p></div>
            ) : (
              lowStock.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.category_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${p.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>{p.quantity} left</span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Min: {p.min_stock_level}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
