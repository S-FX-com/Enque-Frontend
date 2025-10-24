import { Suspense } from 'react';
import { TicketPageContent } from './ticket-page-content';

interface Props {
  params: Promise<{ ticket_id: string }>;
}

export default async function TicketPage({ params }: Props) {
  const { ticket_id } = await params;
  
  // 🔧 VALIDACIÓN: Asegurar que ticket_id sea un número válido
  const ticketId = Number.parseInt(ticket_id, 10);
  
  if (isNaN(ticketId) || ticketId <= 0) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Error</h1>
            <p className="text-gray-600 mt-2">Invalid ticket ID: {ticket_id}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <Suspense
        fallback={<div className="flex items-center justify-center h-96">Loading ticket...</div>}
      >
        <TicketPageContent ticketId={ticketId} />
      </Suspense>
    </div>
  );
}
