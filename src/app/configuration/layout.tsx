'use client';

import AppLayout from '@/components/layouts/app-layout';

export default function ConfigurationLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Configuration', href: '/configuration' },
  ];

  return (
    <AppLayout title="Configuration" breadcrumbs={breadcrumbs}>
      {children}
    </AppLayout>
  );
}
