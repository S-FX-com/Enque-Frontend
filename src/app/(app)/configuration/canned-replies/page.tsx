import { Suspense } from 'react';
import { CannedRepliesClientContent } from './canned-replies-client';
import { CannedRepliesSkeleton } from './canned-replies-skeleton';

// ✅ Server Component (sin 'use client')
export default function CannedRepliesConfigPage() {
  return (
    <Suspense fallback={<CannedRepliesSkeleton />}>
      <CannedRepliesClientContent />
    </Suspense>
  );
}
