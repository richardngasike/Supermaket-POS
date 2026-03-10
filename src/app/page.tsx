'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const user = getUser();
    if (!user) { router.push('/auth/login'); return; }
    if (['admin','manager','supervisor'].includes(user.role)) {
      router.push('/admin');
    } else {
      router.push('/cashier/sell');
    }
  }, [router]);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a14' }}>
      <div style={{ color: '#00d4aa', fontSize: '18px' }}>Loading...</div>
    </div>
  );
}
