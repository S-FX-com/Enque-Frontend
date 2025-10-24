'use client';

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useTicketPreloader } from '@/hooks/use-ticket-preloader';
import { useSocketContext } from './socket-provider';
import { usePathname } from 'next/navigation';

interface TicketPreloaderContextType {
  preloadSpecificTicket: (ticketId: number) => void;
  getTicketStatus: (ticketId: number) => {
    cached: boolean;
    preloading: boolean;
    queued: boolean;
  };
  invalidateTicket: (ticketId: number) => void;
  stats: {
    preloaded: number;
    failed: number;
    inProgress: number;
    lastPreloadTime: Date | null;
  };
  queueSize: number;
}

const TicketPreloaderContext = createContext<TicketPreloaderContextType | undefined>(undefined);

export function TicketPreloaderProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { socket } = useSocketContext();

  // Determinar si debe activarse según la página
  const shouldActivate =
    pathname.startsWith('/tickets') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/my-tickets') ||
    pathname === '/'; // También en home

  const preloaderHook = useTicketPreloader({
    maxConcurrent: 2, // Reducir concurrencia para no sobrecargar
    delayBetweenPreloads: 800, // Más delay para ser amigable con el servidor
    priorityThreshold: 8, // Precargar los 8 más recientes primero
    enableBackgroundPreload: shouldActivate, // Solo activar en páginas relevantes
  });

  // Integrar con Socket.IO para invalidar cache automáticamente
  useEffect(() => {
    if (!socket || !shouldActivate) return;

    // Escuchar actualizaciones de tickets via Socket.IO
    const handleTicketUpdated = (data: { id: number; status?: string }) => {
      // ✅ OPTIMIZACIÓN: Solo invalidar si NO es un ticket cerrado/resuelto
      // Los tickets cerrados no necesitan preloading adicional
      if (data.status === 'Closed') {
        return; // No invalidar para tickets cerrados
      }

      preloaderHook.invalidateTicket(data.id);
    };

    const handleCommentUpdated = (data: { ticket_id: number }) => {
      preloaderHook.invalidateTicket(data.ticket_id);
    };

    // Registrar listeners
    socket.on('ticket_updated', handleTicketUpdated);
    socket.on('comment_updated', handleCommentUpdated);

    return () => {
      socket.off('ticket_updated', handleTicketUpdated);
      socket.off('comment_updated', handleCommentUpdated);
    };
  }, [socket, shouldActivate, preloaderHook]);

  // Solo proporcionar contexto si está activado
  if (!shouldActivate) {
    return (
      <TicketPreloaderContext.Provider value={undefined}>
        {children}
      </TicketPreloaderContext.Provider>
    );
  }

  return (
    <TicketPreloaderContext.Provider value={preloaderHook}>
      {children}
    </TicketPreloaderContext.Provider>
  );
}

export function useTicketPreloaderContext() {
  return useContext(TicketPreloaderContext);
}

// Hook auxiliar que maneja casos donde el context puede ser undefined
export function useTicketPreloaderSafe() {
  const context = useTicketPreloaderContext();

  return {
    preloadSpecificTicket: context?.preloadSpecificTicket || (() => {}),
    getTicketStatus:
      context?.getTicketStatus || (() => ({ cached: false, preloading: false, queued: false })),
    invalidateTicket: context?.invalidateTicket || (() => {}),
    stats: context?.stats || { preloaded: 0, failed: 0, inProgress: 0, lastPreloadTime: null },
    queueSize: context?.queueSize || 0,
    isActive: !!context,
  };
}
