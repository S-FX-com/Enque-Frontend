import { Suspense } from 'react';
import { DashboardClientContent } from './dashboard-client';
import { DashboardSkeleton } from './dashboard-skeleton';

// ✅ Server Component (sin 'use client')
// Beneficios:
// - Reduce bundle size del cliente
// - Faster initial page load
// - SEO-friendly (aunque protegido por auth)
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClientContent />
    </Suspense>
  );
}
