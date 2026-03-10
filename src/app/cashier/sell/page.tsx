'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { formatKES } from '@/lib/format';
import toast from 'react-hot-toast';
import {
  FiSearch, FiShoppingCart, FiX, FiPlus, FiMinus, FiTrash2,
  FiCheckCircle, FiDownload, FiRefreshCw,
  FiPrinter, FiEye, FiAlertCircle, FiTag, FiUser, FiPhone,
} from 'react-icons/fi';
import { MdOutlineQrCodeScanner, MdPointOfSale } from 'react-icons/md';
import { BsCash, BsPhone, BsCreditCard2Front } from 'react-icons/bs';
import { RiSecurePaymentLine } from 'react-icons/ri';

interface CartItem {
  id: string;
  name: string;
  barcode: string;
  selling_price: number;
  vat_rate: number;
  quantity: number;
  stock: number;
  unit: string;
  category_color?: string;
}

interface Sale {
  id: string;
  receipt_number: string;
  total_amount: number;
  payment_method: string;
  change_amount?: number;
  mpesa_ref?: string;
}

type PaymentMethod = 'cash' | 'mpesa' | 'card';

interface PaymentTab {
  key: PaymentMethod;
  label: string;
  Icon: React.ElementType;
}

interface ReceiptBtn {
  label: string;
  icon: React.ElementType;
  color: string;
  action: () => void;
}

const PM_COLORS: Record<PaymentMethod, string> = {
  cash: '#22c55e',
  mpesa: '#00d4aa',
  card: '#a78bfa',
};

export default function SellPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [discount, setDiscount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stkSent, setStkSent] = useState(false);
  const [polling, setPolling] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [receiptMode, setReceiptMode] = useState<'view' | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const params: Record<string, string> = { active: 'true', limit: '200' };
      if (selectedCat) params.category = selectedCat;
      if (search) params.search = search;
      const { data } = await api.get('/products', { params });
      setProducts(data.products);
    } catch {
      toast.error('Failed to load products');
    }
  }, [search, selectedCat]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    api.get('/categories')
      .then(({ data }: { data: { categories: any[] } }) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (receiptUrl) window.URL.revokeObjectURL(receiptUrl);
    };
  }, [receiptUrl]);

  const addToCart = (product: any) => {
    if (product.quantity <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error(`Only ${product.quantity} in stock`);
          return prev;
        }
        return prev.map(i =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        selling_price: parseFloat(product.selling_price),
        vat_rate: parseFloat(product.vat_rate),
        quantity: 1,
        stock: product.quantity,
        unit: product.unit,
        category_color: product.category_color,
      }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return i;
      if (newQty > i.stock) {
        toast.error(`Only ${i.stock} available`);
        return i;
      }
      return { ...i, quantity: newQty };
    }));
  };

  const setQtyDirect = (id: string, val: string) => {
    const qty = parseInt(val);
    if (isNaN(qty) || qty < 1) return;
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      if (qty > i.stock) {
        toast.error(`Only ${i.stock} available`);
        return i;
      }
      return { ...i, quantity: qty };
    }));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const clearCart = () => {
    setCart([]);
    setStkSent(false);
    setDiscount('');
    setCustomerName('');
    setCashTendered('');
    setMpesaPhone('');
    setCardRef('');
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setPolling(false);
  };

  const subtotal = cart.reduce((sum, i) => sum + i.selling_price * i.quantity, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);
  const change = payMethod === 'cash' ? (parseFloat(cashTendered) || 0) - total : 0;
  const vatTotal = cart.reduce((sum, i) => {
    const lineTotal = i.selling_price * i.quantity;
    return sum + (i.vat_rate > 0 ? lineTotal * i.vat_rate / (100 + i.vat_rate) : 0);
  }, 0);
  const totalUnits = cart.reduce((s, i) => s + i.quantity, 0);

  const scanBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    try {
      const { data } = await api.get(`/products/barcode/${barcodeInput.trim()}`);
      addToCart(data.product);
      toast.success(`Added: ${data.product.name}`);
    } catch {
      toast.error(`Product not found: ${barcodeInput}`);
    } finally {
      setBarcodeInput('');
      barcodeRef.current?.focus();
    }
  };

  const sendMpesaSTK = async () => {
    if (!mpesaPhone || mpesaPhone.replace(/\D/g, '').length < 9) {
      toast.error('Enter a valid Safaricom number');
      return;
    }
    setProcessing(true);
    try {
      const { data } = await api.post('/mpesa/stk-push', {
        phone: mpesaPhone,
        amount: total,
        account_ref: 'SUPERMARKET',
      });
      setStkSent(true);
      toast.success('M-Pesa prompt sent! Ask customer to check their phone.');
      startPolling(data.CheckoutRequestID);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'M-Pesa request failed');
    } finally {
      setProcessing(false);
    }
  };

  const startPolling = (id: string) => {
    setPolling(true);
    let attempts = 0;
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const { data } = await api.get(`/mpesa/status/${id}`);
        if (data.transaction.status === 'completed') {
          clearInterval(pollIntervalRef.current!);
          setPolling(false);
          toast.success('M-Pesa payment confirmed!');
          await completeSale(data.transaction.mpesa_receipt_number);
        } else if (
          data.transaction.status === 'failed' ||
          data.transaction.status === 'cancelled'
        ) {
          clearInterval(pollIntervalRef.current!);
          setPolling(false);
          toast.error('M-Pesa payment failed or cancelled');
          setStkSent(false);
        }
      } catch {}
      if (attempts >= 30) {
        clearInterval(pollIntervalRef.current!);
        setPolling(false);
        toast.error('Payment timeout. Please try again.');
        setStkSent(false);
      }
    }, 3000);
  };

  const completeSale = async (mpesaRef?: string) => {
    setProcessing(true);
    try {
      const payload: Record<string, any> = {
        items: cart.map(i => ({ product_id: i.id, quantity: i.quantity })),
        payment_method: payMethod,
        discount_amount: discountAmt,
        customer_name: customerName || undefined,
      };
      if (payMethod === 'cash') payload.amount_tendered = parseFloat(cashTendered) || total;
      if (payMethod === 'mpesa') {
        payload.customer_phone = mpesaPhone;
        payload.mpesa_ref = mpesaRef;
      }
      if (payMethod === 'card') payload.card_ref = cardRef;
      const { data } = await api.post('/sales', payload);
      setCompletedSale(data.sale);
      clearCart();
      toast.success('Sale completed successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Sale failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (payMethod === 'cash') {
      if (!cashTendered || parseFloat(cashTendered) < total) {
        toast.error(`Cash tendered must be at least ${formatKES(total)}`);
        return;
      }
    }
    if (payMethod === 'mpesa' && !stkSent) { await sendMpesaSTK(); return; }
    if (payMethod === 'card' && !cardRef.trim()) {
      toast.error('Enter card approval/reference code');
      return;
    }
    if (payMethod !== 'mpesa') await completeSale();
  };

  const loadReceiptBlob = async (saleId: string): Promise<string | null> => {
    setReceiptLoading(true);
    try {
      if (receiptUrl) window.URL.revokeObjectURL(receiptUrl);
      const response = await api.get(`/reports/receipt/${saleId}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setReceiptUrl(url);
      return url;
    } catch {
      toast.error('Failed to load receipt');
      return null;
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleViewReceipt = async () => {
    if (!completedSale) return;
    const url = await loadReceiptBlob(completedSale.id);
    if (url) setReceiptMode('view');
  };

  const handlePrintReceipt = async () => {
    if (!completedSale) return;
    const url = await loadReceiptBlob(completedSale.id);
    if (!url) return;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 3000);
    };
  };

  const handleDownloadReceipt = async () => {
    if (!completedSale) return;
    try {
      const response = await api.get(`/reports/receipt/${completedSale.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${completedSale.receipt_number}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const closeReceiptModal = () => {
    setCompletedSale(null);
    setReceiptMode(null);
    if (receiptUrl) {
      window.URL.revokeObjectURL(receiptUrl);
      setReceiptUrl(null);
    }
  };

  const spinnerStyle: React.CSSProperties = {
    width: 18,
    height: 18,
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#000',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  };

  const miniSpinner: React.CSSProperties = {
    width: 13,
    height: 13,
    border: '2px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  };

  const paymentTabs: PaymentTab[] = [
    { key: 'cash', label: 'Cash', Icon: BsCash },
    { key: 'mpesa', label: 'M-Pesa', Icon: BsPhone },
    { key: 'card', label: 'Card', Icon: BsCreditCard2Front },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 390px', height: '100vh', overflow: 'hidden' }}>

      {/* ── LEFT: Products ── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>

        {/* Top bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MdPointOfSale size={20} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Point of Sale</span>
          </div>

          {/* Barcode scanner */}
          <form
            onSubmit={scanBarcode}
            style={{ display: 'flex', gap: 8, marginBottom: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', alignItems: 'center' }}
          >
            <MdOutlineQrCodeScanner size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              ref={barcodeRef}
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode or type product code and press Enter..."
              style={{ border: 'none', background: 'transparent', fontSize: 13, flex: 1, outline: 'none', color: 'var(--text-primary)' }}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Scan</button>
          </form>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <FiSearch size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products by name..."
              style={{ paddingLeft: 34, fontSize: 13 }}
            />
          </div>
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 14px', overflowX: 'auto', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0, scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedCat('')}
            className={`chip${selectedCat === '' ? ' active' : ''}`}
            style={{ flexShrink: 0 }}
          >
            <FiTag size={11} /> All
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(selectedCat === c.id ? '' : c.id)}
              className={`chip${selectedCat === c.id ? ' active' : ''}`}
              style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
              {c.name}
              {c.product_count > 0 && (
                <span style={{ fontSize: 10, opacity: 0.7 }}>({c.product_count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10, alignContent: 'start' }}>
          {products.length === 0 ? (
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <FiShoppingCart size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>No products found</p>
            </div>
          ) : products.map(p => {
            const outOfStock: boolean = p.quantity === 0;
            const lowStock: boolean = !outOfStock && p.quantity <= p.min_stock_level;
            const borderColor = lowStock ? 'rgba(245,158,11,0.35)' : 'var(--border)';
            return (
              <div
                key={p.id}
                onClick={() => { if (!outOfStock) addToCart(p); }}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${borderColor}`,
                  borderTop: `3px solid ${p.category_color || 'var(--border)'}`,
                  borderRadius: 12,
                  padding: 12,
                  cursor: outOfStock ? 'not-allowed' : 'pointer',
                  opacity: outOfStock ? 0.5 : 1,
                  transition: 'all 0.18s',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!outOfStock) {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,212,170,0.12)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = borderColor;
                  (e.currentTarget as HTMLDivElement).style.transform = 'none';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  {outOfStock
                    ? <span className="badge badge-danger" style={{ fontSize: 9 }}>OUT</span>
                    : lowStock
                      ? <span className="badge badge-warning" style={{ fontSize: 9 }}>{p.quantity}</span>
                      : <span className="badge badge-success" style={{ fontSize: 9 }}>{p.quantity}</span>
                  }
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${p.category_color || '#333'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <FiShoppingCart size={16} color={p.category_color || 'var(--text-muted)'} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3, marginBottom: 6, minHeight: 30 }}>
                  {p.name.length > 28 ? `${p.name.slice(0, 28)}…` : p.name}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
                  {formatKES(p.selling_price)}
                </div>
                {p.vat_rate > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>VAT {p.vat_rate}%</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>per {p.unit}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Cart & Checkout ── */}
      <div style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Cart header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <FiShoppingCart size={17} />
            Cart
            {cart.length > 0 && (
              <span className="badge badge-accent" style={{ fontSize: 11 }}>{totalUnits} items</span>
            )}
          </div>
          {cart.length > 0 && (
            <button className="btn-icon" onClick={clearCart} title="Clear cart">
              <FiTrash2 size={15} color="var(--danger)" />
            </button>
          )}
        </div>

        {/* Cart items — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <FiShoppingCart size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>Cart is empty</p>
              <p style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>Scan barcode or click products</p>
            </div>
          ) : cart.map(item => (
            <div
              key={item.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${item.category_color || 'var(--accent)'}`,
                borderRadius: 8,
                padding: '9px 10px',
                marginBottom: 7,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {formatKES(item.selling_price)} / {item.unit}
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--danger)', flexShrink: 0 }}
                >
                  <FiX size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    style={{ width: 26, height: 26, borderRadius: 6, background: 'green', color: 'white',border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FiMinus size={11} />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => setQtyDirect(item.id, e.target.value)}
                    style={{ width: 40, height: 26, textAlign: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'monospace', padding: '0 4px', borderRadius: 6 }}
                    min={1}
                    max={item.stock}
                  />
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    style={{ width: 26, height: 26, borderRadius: 6, background: 'red', color: 'white', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FiPlus size={11} />
                  </button>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace', color: 'var(--accent)' }}>
                  {formatKES(item.selling_price * item.quantity)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Fixed bottom section ── */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)' }}>

          {/* Customer & discount */}
          {cart.length > 0 && (
            <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative', marginBottom: 6 }}>
                <FiUser size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer name (optional)"
                  style={{ fontSize: 12, padding: '7px 10px 7px 28px' }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <FiTag size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="Discount (KES)"
                  min={0}
                  style={{ fontSize: 12, padding: '7px 10px 7px 28px' }}
                />
              </div>
            </div>
          )}

          {/* Payment tabs */}
          {cart.length > 0 && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {paymentTabs.map(pm => (
                <button
                  key={pm.key}
                  onClick={() => {
                    setPayMethod(pm.key);
                    setStkSent(false);
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setPolling(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 4px',
                    border: 'none',
                    borderBottom: `2px solid ${payMethod === pm.key ? PM_COLORS[pm.key] : 'transparent'}`,
                    background: payMethod === pm.key ? `${PM_COLORS[pm.key]}18` : 'transparent',
                    color: payMethod === pm.key ? PM_COLORS[pm.key] : 'var(--text-secondary)',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.2s',
                  }}
                >
                  <pm.Icon size={14} />
                  {pm.label}
                </button>
              ))}
            </div>
          )}

          {/* Payment input */}
          {cart.length > 0 && (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>

              {payMethod === 'cash' && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Cash Tendered (KES)
                  </label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    placeholder={`Min: ${total.toFixed(2)}`}
                    style={{ fontSize: 14, fontWeight: 600 }}
                    min={total}
                  />
                  {parseFloat(cashTendered) >= total && parseFloat(cashTendered) > 0 && (
                    <div style={{ marginTop: 7, padding: '8px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--success)' }}>Change:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--success)', fontSize: 15 }}>
                        {formatKES(change)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {payMethod === 'mpesa' && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Customer Safaricom Number
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <FiPhone size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        value={mpesaPhone}
                        onChange={e => setMpesaPhone(e.target.value)}
                        placeholder="07XX XXX XXX"
                        style={{ fontSize: 13, paddingLeft: 28 }}
                        disabled={stkSent}
                      />
                    </div>
                    {stkSent && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flexShrink: 0 }}
                        onClick={() => {
                          setStkSent(false);
                          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                          setPolling(false);
                        }}
                      >
                        <FiX size={12} />
                      </button>
                    )}
                  </div>
                  {stkSent && (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(0,212,170,0.07)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        {polling
                          ? <div style={miniSpinner} />
                          : <BsPhone size={13} color="var(--accent)" />
                        }
                        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                          {polling ? 'Waiting for M-Pesa confirmation...' : 'STK Prompt Sent'}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Ask customer to enter M-Pesa PIN on their phone
                      </p>
                    </div>
                  )}
                </div>
              )}

              {payMethod === 'card' && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Card Approval / Reference Code
                  </label>
                  <div style={{ position: 'relative' }}>
                    <RiSecurePaymentLine size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      value={cardRef}
                      onChange={e => setCardRef(e.target.value)}
                      placeholder="Enter approval code from POS terminal"
                      style={{ fontSize: 13, paddingLeft: 28 }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Totals & checkout */}
          <div style={{ padding: '10px 14px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              <span>Subtotal ({cart.length} lines)</span>
              <span style={{ fontFamily: 'monospace' }}>{formatKES(subtotal)}</span>
            </div>
            {vatTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span>VAT (incl.)</span>
                <span style={{ fontFamily: 'monospace' }}>{formatKES(vatTotal)}</span>
              </div>
            )}
            {discountAmt > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--success)', marginBottom: 4 }}>
                <span>Discount</span>
                <span style={{ fontFamily: 'monospace' }}>-{formatKES(discountAmt)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>TOTAL</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>
                {formatKES(total)}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={processing || cart.length === 0 || polling || (payMethod === 'mpesa' && stkSent)}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: (cart.length === 0 || processing || polling) ? 'not-allowed' : 'pointer',
                background: cart.length === 0 ? 'var(--bg-hover)' : 'var(--accent)',
                color: cart.length === 0 ? 'var(--text-muted)' : '#000',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: (processing || polling) ? 0.8 : 1,
                transition: 'all 0.2s',
              }}
            >
              {processing ? (
                <><div style={spinnerStyle} /> Processing...</>
              ) : polling ? (
                <><FiRefreshCw size={16} /> Waiting for M-Pesa...</>
              ) : payMethod === 'mpesa' && !stkSent ? (
                <><BsPhone size={16} /> Send M-Pesa Request</>
              ) : (
                <><FiCheckCircle size={16} /> Submit &nbsp;&middot;&nbsp; {formatKES(total)}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── COMPLETED SALE MODAL ── */}
      {completedSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            width: '100%',
            maxWidth: receiptMode === 'view' ? 700 : 460,
            maxHeight: '92vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>

            {/* Modal header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16, 16, 16, 0.12)', border: '1.5px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiCheckCircle size={18} color="var(--success)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Sale Complete!</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {completedSale.receipt_number}
                  </div>
                </div>
              </div>

              {/* Universal Close Button */}
                <button
                  onClick={() => setCompletedSale(null)} // closes the modal
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    fontSize: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                  }}
                >
                  <FiX size={20} />
                </button>
              {receiptMode === 'view' && (
                <button
                  onClick={() => setReceiptMode(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <FiX size={20} /> Close
                </button>
              )}
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {receiptMode === 'view' ? (
                <div style={{ height: '65vh', display: 'flex', flexDirection: 'column' }}>
                  {receiptLoading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
                      <div style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Loading receipt...
                    </div>
                  ) : receiptUrl ? (
                    <iframe
                      src={receiptUrl}
                      style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
                      title="Receipt PDF"
                    />
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', gap: 8 }}>
                      <FiAlertCircle size={20} /> Failed to load receipt
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '16px 20px' }}>

                  {/* Sale summary */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 20, color: 'var(--text-secondary)' }}>Total Amount</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--danger)', fontSize: 20 }}>
                        {formatKES(completedSale.total_amount)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Payment Method</span>
                      <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'uppercase', color: PM_COLORS[completedSale.payment_method as PaymentMethod] || 'var(--accent)' }}>
                        {completedSale.payment_method}
                      </span>
                    </div>
                    {completedSale.payment_method === 'cash' && (completedSale.change_amount ?? 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', marginBottom: 8 }}>
                        <span style={{ fontSize: 25, color: 'var(--text-secondary)' }}>Change</span>
                        <span style={{ fontSize: 25, fontFamily: 'monospace', fontWeight: 700, color: 'var(--success)' }}>
                          {formatKES(completedSale.change_amount ?? 0)}
                        </span>
                      </div>
                    )}
                    {completedSale.mpesa_ref && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>M-Pesa Ref</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)' }}>
                          {completedSale.mpesa_ref}
                        </span>
                      </div>
                    )}
                    {customerName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Customer</span>
                        <span style={{ fontSize: 13 }}>{customerName}</span>
                      </div>
                    )}
                  </div>

                  {/* Receipt action buttons */}
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textAlign: 'center' }}>
                    Receipt Options
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {([
                      { label: 'View', icon: FiEye, color: '#60a5fa', action: handleViewReceipt },
                      { label: 'Print', icon: FiPrinter, color: '#a78bfa', action: handlePrintReceipt },
                      { label: 'Download', icon: FiDownload, color: 'var(--accent)', action: handleDownloadReceipt },
                    ] as ReceiptBtn[]).map(btn => (
                      <button
                        key={btn.label}
                        onClick={btn.action}
                        disabled={receiptLoading}
                        style={{
                          padding: '12px 8px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-secondary)',
                          cursor: receiptLoading ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = btn.color;
                          (e.currentTarget as HTMLButtonElement).style.color = btn.color;
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                        }}
                      >
                        {receiptLoading && btn.label === 'View'
                          ? <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: btn.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                          : <btn.icon size={20} color={btn.color} />
                        }
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={closeReceiptModal}
                    style={{
                      width: '100%',
                      padding: '13px 16px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: 'var(--danger)',
                      color: '#ffffff',
                      fontFamily: 'inherit',
                      fontSize: 14,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <FiPlus size={14} /> New Sale
                  </button>
                </div>
              )}
            </div>

            {/* Bottom bar when viewing PDF */}
            {receiptMode === 'view' && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexShrink: 0 }}>
                <button onClick={handlePrintReceipt} className="btn btn-secondary" style={{ flex: 1 }}>
                  <FiPrinter size={14} /> Print
                </button>
                <button onClick={handleDownloadReceipt} className="btn btn-secondary" style={{ flex: 1 }}>
                  <FiDownload size={14} /> Download
                </button>
                <button onClick={closeReceiptModal} className="btn btn-primary" style={{ flex: 1 }}>
                  <FiPlus size={14} /> New Sale
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}