'use client';
import { useState, useEffect, useCallback } from 'react';
import { Download, Search, Eye, FileText, X, Banknote, Smartphone, CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { formatKES, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const pmIcon: Record<string, React.ReactNode> = {
  cash: <Banknote size={14} />,
  mpesa: <Smartphone size={14} />,
  card: <CreditCard size={14} />,
};
const pmBadge: Record<string, string> = { cash: 'badge-success', mpesa: 'badge-accent', card: 'badge-purple' };

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reportData, setReportData] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'summary' | 'transactions'>('summary');

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        api.get('/reports/sales', { params: { start_date: startDate, end_date: endDate } }),
        api.get('/sales', { params: { start_date: startDate, end_date: endDate, limit: 100 } }),
      ]);
      setReportData(rRes.data);
      setSales(sRes.data.sales);
    } catch { toast.error('Failed to load report'); } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { loadReport(); }, []);

  const downloadPDF = async () => {
    try {
      const response = await api.get('/reports/sales', { params: { start_date: startDate, end_date: endDate, format: 'pdf' }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url; a.download = `sales-report-${startDate}-${endDate}.pdf`; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('PDF download failed'); }
  };

  const downloadReceipt = async (saleId: string, receiptNum: string) => {
    try {
      const response = await api.get(`/reports/receipt/${saleId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url; a.download = `receipt-${receiptNum}.pdf`; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Receipt download failed'); }
  };

  const viewSale = async (id: string) => {
    const { data } = await api.get(`/sales/${id}`);
    setSelectedSale(data.sale);
  };

  const s = reportData?.summary || {};

  return (
    <div>
      <div className="page-header">
        <div><h2 style={{ fontSize: 20, fontWeight: 700 }}>Sales Reports</h2></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 'auto' }} />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn btn-primary btn-sm" onClick={loadReport}>Apply</button>
          <button className="btn btn-secondary btn-sm" onClick={downloadPDF}><Download size={14} />PDF</button>
        </div>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button className={`btn ${tab === 'summary' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab('summary')}>Summary</button>
          <button className={`btn ${tab === 'transactions' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab('transactions')}>Transactions</button>
        </div>

        {loading ? <div className="loading"><div className="spinner" /></div> : tab === 'summary' ? (
          <>
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card green">
                <div className="stat-value text-accent">{formatKES(s.total_revenue || 0)}</div>
                <div className="stat-label">Total Revenue</div>
              </div>
              <div className="stat-card blue">
                <div className="stat-value" style={{ color: '#60a5fa' }}>{s.total_sales || 0}</div>
                <div className="stat-label">Transactions</div>
              </div>
              <div className="stat-card green">
                <div className="stat-value text-success">{formatKES(s.cash_revenue || 0)}</div>
                <div className="stat-label">Cash</div>
              </div>
              <div className="stat-card purple">
                <div className="stat-value text-accent">{formatKES(s.mpesa_revenue || 0)}</div>
                <div className="stat-label">M-Pesa</div>
              </div>
              <div className="stat-card blue">
                <div className="stat-value" style={{ color: '#a78bfa' }}>{formatKES(s.card_revenue || 0)}</div>
                <div className="stat-label">Card</div>
              </div>
              <div className="stat-card yellow">
                <div className="stat-value text-warning">{formatKES(s.total_vat || 0)}</div>
                <div className="stat-label">VAT Collected</div>
              </div>
            </div>

            {reportData?.sales_by_day?.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header"><span className="card-title">Daily Revenue</span></div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={reportData.sales_by_day}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(v: any) => formatKES(v)} />
                    <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid-2">
              {reportData?.top_products?.length > 0 && (
                <div className="card">
                  <div className="card-header"><span className="card-title">Top Products</span></div>
                  {reportData.top_products.slice(0, 10).map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-muted)' }}>{i + 1}</span>
                        <span style={{ fontSize: 13 }}>{p.product_name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{formatKES(p.total_revenue)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.total_qty} sold</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {reportData?.cashier_performance?.length > 0 && (
                <div className="card">
                  <div className="card-header"><span className="card-title">Cashier Performance</span></div>
                  {reportData.cashier_performance.map((c: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.sale_count} transactions</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{formatKES(c.revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Receipt No.</th><th>Date & Time</th><th>Cashier</th><th>Payment</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td><span className="mono" style={{ fontSize: 12 }}>{sale.receipt_number}</span></td>
                    <td style={{ fontSize: 12 }}>{formatDate(sale.created_at)}</td>
                    <td style={{ fontSize: 13 }}>{sale.cashier_name}</td>
                    <td><span className={`badge ${pmBadge[sale.payment_method]}`}>{pmIcon[sale.payment_method]} {sale.payment_method}</span></td>
                    <td style={{ fontSize: 12 }}>—</td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatKES(sale.total_amount)}</td>
                    <td><span className={`badge ${sale.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>{sale.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" title="View" onClick={() => viewSale(sale.id)}><Eye size={14} /></button>
                        <button className="btn-icon" title="Download Receipt" onClick={() => downloadReceipt(sale.id, sale.receipt_number)}><Download size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSale && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedSale(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{selectedSale.receipt_number}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => downloadReceipt(selectedSale.id, selectedSale.receipt_number)}><Download size={12} />Receipt</button>
                <button className="btn-icon" onClick={() => setSelectedSale(null)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date</p><p style={{ fontSize: 13 }}>{formatDate(selectedSale.created_at)}</p></div>
                <div><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cashier</p><p style={{ fontSize: 13 }}>{selectedSale.cashier_name}</p></div>
                <div><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Payment</p><span className={`badge ${pmBadge[selectedSale.payment_method]}`}>{selectedSale.payment_method}</span></div>
                <div><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status</p><span className={`badge ${selectedSale.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>{selectedSale.status}</span></div>
              </div>
              <div className="divider" />
              <table style={{ width: '100%', marginBottom: 16 }}>
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {selectedSale.items?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontSize: 13 }}>{item.product_name}</td>
                      <td style={{ fontSize: 13 }}>{item.quantity}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{formatKES(item.unit_price)}</td>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{formatKES(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="divider" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>Subtotal</span><span className="mono">{formatKES(selectedSale.subtotal)}</span></div>
                {selectedSale.vat_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>VAT</span><span className="mono">{formatKES(selectedSale.vat_amount)}</span></div>}
                {selectedSale.discount_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>Discount</span><span className="mono text-success">-{formatKES(selectedSale.discount_amount)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>TOTAL</span>
                  <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{formatKES(selectedSale.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
