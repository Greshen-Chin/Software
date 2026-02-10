import { io } from 'socket.io-client';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      autoConnect: false,
      auth: {
        token: localStorage.getItem('token'),
      },
    });
  } else {
    socket.auth = { token: localStorage.getItem('token') };
  }
  return socket;
}
