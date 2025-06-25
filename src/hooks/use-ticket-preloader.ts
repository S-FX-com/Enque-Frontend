'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getTicketHtmlContent } from '@/services/ticket';
import { useGlobalTicketsContext } from '@/providers/global-tickets-provider';
import { useAuth } from './use-auth';

interface PreloadStats {
  preloaded: number;
  failed: number;
  inProgress: number;
  lastPreloadTime: Date | null;
}

interface PreloadOptions {
  maxConcurrent?: number;
  delayBetweenPreloads?: number;
  priorityThreshold?: number; // Número de tickets más recientes a priorizar
  enableBackgroundPreload?: boolean;
}

const DEFAULT_OPTIONS: Required<PreloadOptions> = {
  maxConcurrent: 3,
  delayBetweenPreloads: 500, // 500ms entre precargas
  priorityThreshold: 10, // Precargar los 10 tickets más recientes primero
  enableBackgroundPreload: true,
};

export function useTicketPreloader(options: PreloadOptions = {}) {
  const queryClient = useQueryClient();
  const { allTicketsData } = useGlobalTicketsContext();
  const { user } = useAuth();
  const config = { ...DEFAULT_OPTIONS, ...options };

  const [stats, setStats] = useState<PreloadStats>({
    preloaded: 0,
    failed: 0,
    inProgress: 0,
    lastPreloadTime: null,
  });

  const preloadQueueRef = useRef<Set<number>>(new Set());
  const preloadingRef = useRef<Set<number>>(new Set());
  const lastPreloadRef = useRef<Date | null>(null);

  // Helper: Check if ticket data is already in cache - usando useCallback para estabilidad
  const isTicketCached = useCallback(
    (ticketId: number): boolean => {
      const cached = queryClient.getQueryData(['ticketHtml', ticketId]);
      return !!cached;
    },
    [queryClient]
  );

  // Helper: Preload a single ticket - usando useCallback para estabilidad
  const preloadTicket = useCallback(
    async (ticketId: number): Promise<boolean> => {
      if (preloadingRef.current.has(ticketId)) {
        return false; // Ya está siendo precargado
      }

      if (isTicketCached(ticketId)) {
        return true; // Ya está en cache
      }

      try {
        preloadingRef.current.add(ticketId);
        setStats(prev => ({ ...prev, inProgress: prev.inProgress + 1 }));

        // Usar prefetchQuery para cargar en segundo plano sin mostrar loading
        await queryClient.prefetchQuery({
          queryKey: ['ticketHtml', ticketId],
          queryFn: () => getTicketHtmlContent(ticketId),
          staleTime: 5 * 60 * 1000, // 5 minutos de frescura
          gcTime: 15 * 60 * 1000, // 15 minutos en cache
        });

        setStats(prev => ({
          ...prev,
          preloaded: prev.preloaded + 1,
          inProgress: prev.inProgress - 1,
          lastPreloadTime: new Date(),
        }));

        return true;
      } catch (error) {
        console.warn(`Failed to preload ticket ${ticketId}:`, error);
        setStats(prev => ({
          ...prev,
          failed: prev.failed + 1,
          inProgress: prev.inProgress - 1,
        }));
        return false;
      } finally {
        preloadingRef.current.delete(ticketId);
        lastPreloadRef.current = new Date();
      }
    },
    [queryClient, isTicketCached]
  );

  // Helper: Process preload queue - usando useCallback para estabilidad
  const processQueue = useCallback(
    async function processQueue() {
      if (preloadQueueRef.current.size === 0) return;
      if (preloadingRef.current.size >= config.maxConcurrent) return;

      const now = Date.now();
      const lastPreload = lastPreloadRef.current?.getTime() || 0;

      if (now - lastPreload < config.delayBetweenPreloads) {
        // Esperar el delay configurado
        setTimeout(processQueue, config.delayBetweenPreloads - (now - lastPreload));
        return;
      }

      // Tomar el siguiente ticket de la cola
      const nextTicketId = Array.from(preloadQueueRef.current)[0];
      preloadQueueRef.current.delete(nextTicketId);

      await preloadTicket(nextTicketId);

      // Continuar procesando la cola
      if (preloadQueueRef.current.size > 0) {
        setTimeout(processQueue, config.delayBetweenPreloads);
      }
    },
    [config.maxConcurrent, config.delayBetweenPreloads, preloadTicket]
  );

  // Main preload function - usando useCallback para evitar recreación
  const preloadTickets = useCallback(
    (ticketIds: number[], priority = false) => {
      if (!config.enableBackgroundPreload) return;
      if (!user?.workspace_id) return;

      const newTickets = ticketIds.filter(
        id =>
          !isTicketCached(id) && !preloadingRef.current.has(id) && !preloadQueueRef.current.has(id)
      );

      if (newTickets.length === 0) return;

      if (priority) {
        // Prioridad alta: añadir al inicio de la cola
        const currentQueue = Array.from(preloadQueueRef.current);
        preloadQueueRef.current.clear();
        newTickets.forEach(id => preloadQueueRef.current.add(id));
        currentQueue.forEach(id => preloadQueueRef.current.add(id));
      } else {
        // Prioridad normal: añadir al final
        newTickets.forEach(id => preloadQueueRef.current.add(id));
      }

      // Iniciar procesamiento si no está en progreso
      if (preloadingRef.current.size === 0) {
        setTimeout(processQueue, 100); // Pequeño delay para evitar spam
      }
    },
    [config.enableBackgroundPreload, user?.workspace_id, isTicketCached, processQueue]
  );

  // Preload visible tickets when tickets list changes
  useEffect(() => {
    if (!allTicketsData || allTicketsData.length === 0) return;

    // Obtener IDs de tickets, priorizando los más recientes
    const ticketIds = allTicketsData
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(ticket => ticket.id);

    // Precargar tickets prioritarios (más recientes) con alta prioridad
    const priorityTickets = ticketIds.slice(0, config.priorityThreshold);
    preloadTickets(priorityTickets, true);

    // Precargar el resto con prioridad normal
    const remainingTickets = ticketIds.slice(config.priorityThreshold);
    preloadTickets(remainingTickets, false);
  }, [allTicketsData, config.priorityThreshold, preloadTickets]);

  // Preload specific ticket (called when user hovers or navigates)
  const preloadSpecificTicket = useCallback(
    (ticketId: number) => {
      preloadTickets([ticketId], true); // Alta prioridad
    },
    [preloadTickets]
  );

  // Get preload status for a specific ticket
  const getTicketStatus = (ticketId: number) => {
    return {
      cached: isTicketCached(ticketId),
      preloading: preloadingRef.current.has(ticketId),
      queued: preloadQueueRef.current.has(ticketId),
    };
  };

  // Clear cache for specific ticket (when updated via Socket.IO)
  const invalidateTicket = useCallback(
    (ticketId: number) => {
      // Solo invalidar si realmente necesitamos datos frescos
      const existingData = queryClient.getQueryData(['ticketHtml', ticketId]);
      if (existingData) {
        // Marcar como stale en lugar de eliminar completamente
        queryClient.invalidateQueries({ queryKey: ['ticketHtml', ticketId] });
        // Re-preload en background con prioridad normal para no interferir
        setTimeout(() => preloadSpecificTicket(ticketId), 500);
      }
    },
    [queryClient, preloadSpecificTicket]
  );

  return {
    preloadSpecificTicket,
    getTicketStatus,
    invalidateTicket,
    stats,
    queueSize: preloadQueueRef.current.size,
  };
}
