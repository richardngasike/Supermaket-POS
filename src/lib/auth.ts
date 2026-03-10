import Cookies from 'js-cookie';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'cashier' | 'manager' | 'supervisor';
  is_active: boolean;
  phone?: string;
}

export const getUser = (): User | null => {
  try {
    const u = Cookies.get('pos_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};

export const getToken = () => Cookies.get('pos_token') || null;

export const setAuth = (token: string, user: User) => {
  Cookies.set('pos_token', token, { expires: 1 });
  Cookies.set('pos_user', JSON.stringify(user), { expires: 1 });
};

export const clearAuth = () => {
  Cookies.remove('pos_token');
  Cookies.remove('pos_user');
};

export const isAdmin = (user: User | null) => user?.role === 'admin';
export const isManager = (user: User | null) => user?.role === 'manager';
export const isSupervisor = (user: User | null) => user?.role === 'supervisor';
export const canManageInventory = (user: User | null) => ['admin','manager'].includes(user?.role || '');
export const canViewReports = (user: User | null) => ['admin','manager','supervisor'].includes(user?.role || '');
