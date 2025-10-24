'use client';

import { GlobalTicketsProvider } from '@/providers/global-tickets-provider';
import { SocketProvider } from '@/providers/socket-provider';
import { TicketPreloaderProvider } from '@/providers/ticket-preloader-provider';
import { TokenHandler } from '@/components/providers/TokenHandler';
import { Suspense } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <Suspense fallback={null}>
        <TokenHandler />
      </Suspense>
      <GlobalTicketsProvider>
        <TicketPreloaderProvider>{children}</TicketPreloaderProvider>
      </GlobalTicketsProvider>
    </SocketProvider>
  );
}
