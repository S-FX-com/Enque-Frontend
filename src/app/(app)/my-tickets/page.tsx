import { Suspense } from 'react';
import { MyTicketsClientContent } from './my-tickets-client';
import { MyTicketsSkeleton } from './my-tickets-skeleton';

// ✅ Server Component (sin 'use client')
export default function MyTicketsPage() {
  return (
    <Suspense fallback={<MyTicketsSkeleton />}>
      <MyTicketsClientContent />
    </Suspense>
  );
}
