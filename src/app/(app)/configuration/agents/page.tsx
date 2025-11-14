import { Suspense } from 'react';
import { AgentsClientContent } from './agents-client';
import { AgentsSkeleton } from './agents-skeleton';

// ✅ Server Component (sin 'use client')
export default function AgentsPage() {
  return (
    <Suspense fallback={<AgentsSkeleton />}>
      <AgentsClientContent />
    </Suspense>
  );
}
