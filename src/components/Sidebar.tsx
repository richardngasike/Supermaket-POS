'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart2, Settings, LogOut, Tag, AlertTriangle, History, PlusCircle, Pen } from 'lucide-react';
import { getUser, clearAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

const adminNav = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Inventory', href: '/admin/inventory', icon: Package },
  { label: 'Categories', href: '/admin/inventory/categories', icon: Tag },
  { label: 'Low Stock', href: '/admin/inventory/low-stock', icon: AlertTriangle },
  { label: 'Sales History', href: '/admin/reports', icon: BarChart2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

const cashierNav = [
  { label: 'New Sale', href: '/cashier/sell', icon: ShoppingCart },
  { label: 'Sales History', href: '/cashier/history', icon: History },
  { label: 'Expenses', href: '/cashier/expenses', icon: Pen },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const navItems = ['admin','manager','supervisor'].includes(user?.role || '') ? adminNav : cashierNav;

  const logout = () => {
    clearAuth();
    toast.success('Logged out');
    router.push('/auth/login');
  };

  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const roleColors: Record<string, string> = { admin: '#ef4444', manager: '#7c3aed', supervisor: '#f59e0b', cashier: '#00d4aa' };
  const roleColor = roleColors[user?.role || 'cashier'] || '#00d4aa';

  return (
    <div className="sidebar">
      <div className="nav-logo">
        <h1>🛒SUPERMAKET</h1>
        <p>Supermakets Point of Sale</p>
      </div>
      <div className="nav-section">
        <div className="nav-section-title">Menu</div>
        {navItems.map(item => {
          const Icon = item.icon;
          const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon size={16} />{item.label}
            </Link>
          );
        })}
      </div>
      <div className="nav-footer">
        <div className="nav-user" style={{ marginBottom: 12 }}>
          <div className="nav-user-avatar" style={{ background: `linear-gradient(135deg, ${roleColor}, var(--accent2))` }}>{initials}</div>
            suppressHydrationWarning
          <div className="nav-user-info">
            <h4 className="truncate" style={{ maxWidth: 130 }}>{user?.full_name}</h4>
            <p style={{ color: roleColor }}>{user?.role}</p>
          </div>
        </div>
        <button className="btn btn-ghost btn-full btn-sm" onClick={logout}>
          <LogOut size={14} />Logout
        </button>
      </div>
    </div>
  );
}
