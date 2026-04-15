'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type OrdersSocketEvents = {
  'orders:updated': (data: { storeId: string; timestamp: string }) => void;
  'orders:new': (data: { orderId: string; orderNumber: string; storeId: string; timestamp: string }) => void;
  'orders:changed': (data: { orderId: string; storeId: string; timestamp: string }) => void;
};

type EventCallback = () => void;

/**
 * Connects to the backend WebSocket /events namespace and calls onOrdersChanged
 * whenever any order event is received. Falls back to no-op if not supported.
 */
export function useOrdersSocket(onOrdersChanged: EventCallback) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onOrdersChanged);

  // Keep callback ref up-to-date without reconnecting
  useEffect(() => {
    callbackRef.current = onOrdersChanged;
  }, [onOrdersChanged]);

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

    const socket: Socket = io(`${backendUrl}/events`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    const trigger = () => callbackRef.current();

    socket.on('orders:updated', trigger);
    socket.on('orders:new', trigger);
    socket.on('orders:changed', trigger);

    return () => {
      socket.off('orders:updated', trigger);
      socket.off('orders:new', trigger);
      socket.off('orders:changed', trigger);
      socket.disconnect();
    };
  }, []); // single connection for lifetime of component
}
