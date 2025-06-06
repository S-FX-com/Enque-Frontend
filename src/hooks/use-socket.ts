import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './use-auth';
import { useQueryClient } from '@tanstack/react-query';
import type { ITicket } from '@/typescript/ticket';
import type { IComment } from '@/typescript/comment';
import { toast } from 'sonner';

interface TeamData {
  id: number;
  name: string;
  workspace_id: number;
}

interface SocketEvents {
  connected: (data: { status: string; workspace_id: number; message: string }) => void;
  new_ticket: (ticket: ITicket) => void;
  ticket_updated: (ticket: ITicket) => void;
  ticket_deleted: (data: { ticket_id: number }) => void;
  comment_updated: (comment: IComment) => void; // ✅ CORREGIDO
  team_updated: (team: TeamData) => void;
  error: (error: { message: string }) => void;
}

export function useSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.workspace_id) {
      return;
    }

    // Socket.IO server URL - usar la URL base sin /v1
    const SOCKET_URL =
      process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

    // Crear conexión Socket.IO con configuración perfecta
    const socket = io(SOCKET_URL, {
      auth: {
        workspace_id: user.workspace_id,
      },
      query: {
        workspace_id: user.workspace_id.toString(),
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: false, // Permitir reutilización de conexión
    });

    socketRef.current = socket;

    // Event: Conexión exitosa
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);

      // Test de conexión
      socket.emit('ping', { message: 'testing connection' });
    });

    // Event: Confirmación de conexión del servidor
    socket.on('connected', () => {
      toast.success('Actualizaciones en tiempo real activadas');
    });

    // 🎯 EVENTOS DE TICKETS - invalidar tanto query optimizada como fallback
    socket.on('new_ticket', data => {
      console.log('🎫 New ticket created:', data);

      // Invalidar listas de tickets
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount'] });

      // Mostrar notificación
      toast.info(`New ticket created: ${data.title}`);
    });

    socket.on('ticket_updated', data => {
      console.log('📝 Ticket updated:', data);

      // Invalidar datos específicos del ticket
      queryClient.invalidateQueries({ queryKey: ['ticket', data.id] });
      queryClient.invalidateQueries({ queryKey: ['ticketHtml', data.id] }); // 🚀 NUEVA QUERY
      queryClient.invalidateQueries({ queryKey: ['comments', data.id] });

      // Invalidar listas de tickets
      queryClient.invalidateQueries({ queryKey: ['tickets'] });

      // ✅ NOTIFICACIÓN ELIMINADA: No mostrar toast para actualizaciones de ticket
      // Los datos se actualizan silenciosamente en segundo plano
    });

    socket.on('ticket_deleted', data => {
      console.log('🗑️ Ticket deleted:', data);

      // Remover del cache
      queryClient.removeQueries({ queryKey: ['ticket', data.id] });
      queryClient.removeQueries({ queryKey: ['ticketHtml', data.id] }); // 🚀 NUEVA QUERY
      queryClient.removeQueries({ queryKey: ['comments', data.id] });

      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount'] });

      // ✅ NOTIFICACIÓN ELIMINADA: No mostrar toast para eliminación de ticket
      // Los datos se actualizan silenciosamente
    });

    // ✅ CORREGIDO: escuchar 'comment_updated' en lugar de 'new_comment'
    socket.on('comment_updated', data => {
      console.log('💬 Comment updated/added:', data);

      // Invalidar contenido HTML completo del ticket
      queryClient.invalidateQueries({ queryKey: ['ticketHtml', data.ticket_id] }); // 🚀 PRIORIDAD

      // Invalidar comentarios como fallback
      queryClient.invalidateQueries({ queryKey: ['comments', data.ticket_id] });

      // Invalidar el ticket en sí (por si cambió status, etc.)
      queryClient.invalidateQueries({ queryKey: ['ticket', data.ticket_id] });

      // Invalidar listas (por si afecta contadores)
      queryClient.invalidateQueries({ queryKey: ['tickets'] });

      // Mostrar notificación si no es del usuario actual
      if (data.agent_id !== user?.id) {
        const senderName = data.agent_name || data.user_name || 'Someone';
        toast.info(`${senderName} added a comment to ticket #${data.ticket_id}`);
      }
    });

    // Event: Equipo actualizado
    socket.on('team_updated', () => {
      // Invalidar queries de equipos
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
    });

    // Event: Error
    socket.on('error', (error: { message: string }) => {
      setConnectionError(error.message);
      toast.error(`Error de conexión: ${error.message}`);
    });

    // Event: Desconexión
    socket.on('disconnect', reason => {
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        // Reconexión manual si el servidor cerró la conexión
        socket.connect();
      }
    });

    // Event: Error de conexión
    socket.on('connect_error', error => {
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Event: Reconexión exitosa
    socket.on('reconnect', () => {
      setIsConnected(true);
      setConnectionError(null);
      toast.success('Conexión restaurada');
    });

    // Event: Error de reconexión
    socket.on('reconnect_error', error => {
      setConnectionError(error.message);
    });

    // Event: Respuesta de ping
    socket.on('pong', () => {
      // Conexión verificada
    });

    // Cleanup al desmontar
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user?.workspace_id, user?.id, queryClient]);

  // Función para emitir eventos
  const emit = <T extends keyof SocketEvents>(event: T, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket no conectado, no se puede emitir:', event);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
  };
}
