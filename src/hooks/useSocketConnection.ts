import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';

interface SocketEvents {
  connected: (data: { status: string; workspace_id: number; message: string }) => void;
  new_ticket: (ticket: unknown) => void;
  ticket_updated: (ticket: unknown) => void;
  ticket_deleted: (data: { ticket_id: number }) => void;
  comment_updated: (data: unknown) => void;
  team_updated: (team: unknown) => void;
  error: (error: { message: string }) => void;
}

/**
 * ⚡ OPTIMIZADO: Hook especializado para gestionar la conexión Socket.IO
 * Separado de use-socket.ts para mejorar mantenibilidad
 */
export function useSocketConnection() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.workspace_id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    const SOCKET_URL =
      process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

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
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: false,
      autoConnect: true,
      upgrade: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      socket.emit('ping', { message: 'testing connection' });
    });

    socket.on('connected', () => {
      toast.success('Actualizaciones en tiempo real activadas');
    });

    return () => {
      if (socket && socket.connected) {
        socket.removeAllListeners();
      }
    };
  }, [user?.workspace_id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, []);

  const emit = <T extends keyof SocketEvents>(event: T, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    setConnectionError,
    setIsConnected,
    emit,
  };
}
