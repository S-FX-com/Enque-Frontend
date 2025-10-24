'use client';

import AppLayout from '@/components/layouts/app-layout';

export default function ConfigurationLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'My Tickets', href: '/my-tickets' },
  ];

  return (
    <AppLayout title="My Tickets" breadcrumbs={breadcrumbs}>
      {children}
    </AppLayout>
  );
}
