import { io } from 'socket.io-client';

export function getClientId() {
  let id = localStorage.getItem('asta_client_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('asta_client_id', id);
  }
  return id;
}

export function createSocket() {
  const url = import.meta.env.VITE_SERVER_URL || undefined; // undefined = same origin
  return io(url, { autoConnect: true });
}
