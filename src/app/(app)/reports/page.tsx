import { Suspense } from 'react';
import { ReportsClientContent } from './reports-client';
import { ReportsSkeleton } from './reports-skeleton';

// ✅ Server Component (sin 'use client')
// La lógica interactiva (filtros, gráficos) está en reports-client.tsx
export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsClientContent />
    </Suspense>
  );
}
