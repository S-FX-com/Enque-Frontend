import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { devLog } from '@/lib/dev-logger';

/**
 * ⚡ OPTIMIZADO: Hook especializado para manejo de errores y reconexión
 * Separado de use-socket.ts para mejorar mantenibilidad
 */
export function useSocketErrors(
  socket: Socket | null,
  setConnectionError: (error: string | null) => void,
  setIsConnected: (connected: boolean) => void
) {
  const socketRef = useRef(socket);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleError = (error: { message: string }) => {
      setConnectionError(error.message);
      toast.error(`Error de conexión: ${error.message}`);
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      devLog.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            socket.connect();
          }
        }, 1000);
      }
    };

    const handleConnectError = (error: Error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    };

    const handleReconnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      toast.success('Conexión restaurada');
    };

    const handleReconnectError = (error: Error) => {
      setConnectionError(error.message);
    };

    const handlePong = () => {
      // Empty handler for pong events
    };

    socket.on('error', handleError);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_error', handleReconnectError);
    socket.on('pong', handlePong);

    return () => {
      socket.off('error', handleError);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_error', handleReconnectError);
      socket.off('pong', handlePong);
    };
  }, [socket, setConnectionError, setIsConnected]);
}
