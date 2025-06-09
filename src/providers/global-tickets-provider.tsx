'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useGlobalTickets } from '@/hooks/use-global-tickets';
import type { ITicket } from '@/typescript/ticket';

interface GlobalTicketsContextType {
  allTicketsData: ITicket[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoadingTickets: boolean;
  isTicketsError: boolean;
  ticketsError: Error | null;
}

const GlobalTicketsContext = createContext<GlobalTicketsContextType | undefined>(undefined);

export function GlobalTicketsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Solo activar en páginas relevantes de tickets y dashboard
  const shouldActivate =
    pathname.startsWith('/tickets') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/my-tickets') ||
    pathname === '/'; // También en home

  const ticketsData = useGlobalTickets(shouldActivate);

  return (
    <GlobalTicketsContext.Provider value={ticketsData}>{children}</GlobalTicketsContext.Provider>
  );
}

export function useGlobalTicketsContext() {
  const context = useContext(GlobalTicketsContext);
  if (context === undefined) {
    throw new Error('useGlobalTicketsContext must be used within a GlobalTicketsProvider');
  }
  return context;
}
