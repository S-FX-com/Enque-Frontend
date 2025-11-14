import { Suspense } from 'react';
import { TeamsClientContent } from './teams-client';
import { TeamsSkeleton } from './teams-skeleton';

// ✅ Server Component (sin 'use client')
export default function TeamsPage() {
  return (
    <Suspense fallback={<TeamsSkeleton />}>
      <TeamsClientContent />
    </Suspense>
  );
}
