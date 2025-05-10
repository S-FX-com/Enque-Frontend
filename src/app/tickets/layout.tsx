'use client';

import AppLayout from '@/components/layouts/app-layout';

export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Tickets', href: '/tickets' },
  ];

  return (
    <AppLayout title="Tickets" breadcrumbs={breadcrumbs}>
      {children}
    </AppLayout>
  );
}
