'use client';

import AppLayout from '@/components/layouts/app-layout';

export default function UsersCompaniesPage({ children }: { children: React.ReactNode }) {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' }, // Corrected href
    { label: 'Users & Companies', href: '/users-companies' }, // Capitalized and corrected href
  ];

  return (
    <AppLayout title="Users & Companies" breadcrumbs={breadcrumbs}>
      {' '}
      {/* Capitalized title */}
      {children}
    </AppLayout>
  );
}
