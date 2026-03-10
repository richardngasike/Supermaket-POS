'use client';
import { useState, useEffect } from 'react';
import { Download, Eye, X } from 'lucide-react';
import api from '@/lib/api';
import { formatKES, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';
import { getUser } from '@/lib/auth';

const pmBadge: Record<string, string> = { cash: 'badge-success', mpesa: 'badge-accent', card: 'badge-purple' };

export default function HistoryPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const user = getUser();

  useEffect(() => {
    const load = async () => {
      const params: any = { limit: 50 };
      if (user?.role === 'cashier') params.cashier_id = user.id;
      const { data } = await api.get('/sales', { params });
      setSales(data.sales);
      setLoading(false);
    };
    load();
  }, []);

  const viewSale = async (id: string) => {
    const { data } = await api.get(`/sales/${id}`);
    setSelectedSale(data.sale);
  };

  const downloadReceipt = async (saleId: string, receiptNum: string) => {
    try {
      const response = await api.get(`/reports/receipt/${saleId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url; a.download = `receipt-${receiptNum}.pdf`; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  return (
    <div>
      <div className="page-header"><div><h2 style={{ fontSize: 20, fontWeight: 700 }}>Sales History</h2><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Recent transactions</p></div></div>
      <div className="page-body">
        {loading ? <div className="loading"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Receipt</th><th>Date</th><th>Payment</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td><span className="mono" style={{ fontSize: 12 }}>{sale.receipt_number}</span></td>
                    <td style={{ fontSize: 12 }}>{formatDate(sale.created_at)}</td>
                    <td><span className={`badge ${pmBadge[sale.payment_method]}`}>{sale.payment_method}</span></td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatKES(sale.total_amount)}</td>
                    <td><span className={`badge ${sale.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>{sale.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => viewSale(sale.id)}><Eye size={14} /></button>
                        <button className="btn-icon" onClick={() => downloadReceipt(sale.id, sale.receipt_number)}><Download size={14} /></button>
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
                <button className="btn btn-primary btn-sm" onClick={() => downloadReceipt(selectedSale.id, selectedSale.receipt_number)}><Download size={12} />PDF</button>
                <button className="btn-icon" onClick={() => setSelectedSale(null)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date</p><p style={{ fontSize: 13 }}>{formatDate(selectedSale.created_at)}</p></div>
                <div><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Payment</p><span className={`badge ${pmBadge[selectedSale.payment_method]}`}>{selectedSale.payment_method}</span></div>
              </div>
              <div className="divider" />
              <table style={{ width: '100%', marginBottom: 16 }}>
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {selectedSale.items?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontSize: 13 }}>{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{formatKES(item.unit_price)}</td>
                      <td className="mono" style={{ color: 'var(--accent)' }}>{formatKES(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>TOTAL</span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatKES(selectedSale.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
