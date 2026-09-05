import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './api';

let socket: Socket | null = null;

export const initSocket = async (): Promise<Socket> => {
  const token = await SecureStore.getItemAsync('authToken');

  if (!socket || !socket.connected) {
    socket = io(API_URL, {
      auth: {
        token: token ? `Bearer ${token}` : '',
      },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected to socket server:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
    });

    socket.on('connect_error', (err) => {
      console.log('Socket connection error:', err.message);
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => socket;
export const GetSocket = getSocket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};