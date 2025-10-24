'use client';

import AppLayout from '@/components/layouts/app-layout';

export default function ReportsPageLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Reports', href: '/reports' },
  ];

  return (
    <AppLayout title="Reports" breadcrumbs={breadcrumbs}>
      {children}
    </AppLayout>
  );
}
