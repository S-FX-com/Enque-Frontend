import { Suspense } from 'react';
import { AutomationsClientContent } from './automations-client';
import { AutomationsSkeleton } from './automations-skeleton';

// ✅ Server Component (sin 'use client')
export default function AutomationsPage() {
  return (
    <Suspense fallback={<AutomationsSkeleton />}>
      <AutomationsClientContent />
    </Suspense>
  );
}
