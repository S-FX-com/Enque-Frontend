import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * ⚡ OPTIMIZADO: Hook especializado para eventos de equipos
 * Separado de use-socket.ts para mejorar mantenibilidad
 */
export function useTeamEvents(socket: Socket | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleTeamUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
      queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
    };

    socket.on('team_updated', handleTeamUpdated);

    return () => {
      socket.off('team_updated', handleTeamUpdated);
    };
  }, [socket, queryClient]);
}
