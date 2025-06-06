'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  emit: (event: string, data?: unknown) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected, connectionError, emit } = useSocket();

  const contextValue = {
    socket,
    isConnected,
    connectionError,
    emit: (event: string, data?: unknown) => {
      // Tipo seguro para emitir eventos genéricos
      emit(event as never, data);
    },
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
