'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getUser } from '@/lib/auth';

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const user = getUser();
    if (!user) { router.push('/auth/login'); }
  }, [router]);
  return (
    <div className="page-wrapper">
      <Sidebar />
      <div className="main-content" style={{ overflow: 'hidden' }}>{children}</div>
    </div>
  );
}
