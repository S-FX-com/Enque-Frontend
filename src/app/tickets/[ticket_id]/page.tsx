import { Suspense } from 'react';
import { TicketPageContent } from './ticket-page-content';

interface Props {
  params: Promise<{ ticket_id: string }>;
}

export default async function TicketPage({ params }: Props) {
  const { ticket_id } = await params;

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense
        fallback={<div className="flex items-center justify-center h-96">Loading ticket...</div>}
      >
        <TicketPageContent ticketId={Number.parseInt(ticket_id, 10)} />
      </Suspense>
    </div>
  );
}
