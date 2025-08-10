# WS Socket.IO Adapter Documentation

A Socket.IO-compatible WebSocket adapter that provides a familiar, event-driven API over native WebSockets, written in TypeScript.

- High-level overview and quick start are here.
- Detailed APIs are in the API Reference.
- Guidance for moving from Socket.IO is in the Migration Guide.

Features
- Socket.IO-like Server and Client APIs
- Namespaces and rooms
- Broadcast operators (to, in, except, chainable)
- Middleware for connections and events
- TypeScript types for client/server
- Jest tests and TypeScript build setup

Installation
- Prerequisites: Node.js >= 16.0.0
- Install from npm:
  - npm install ws-socketio-adapter

Quick Start
Server (Node.js)
- Import the server class and start listening.

```ts
import { SocketIOLikeServer } from 'ws-socketio-adapter';

const server = new SocketIOLikeServer();
server.listen(3000, () => console.log('Server listening on ws://localhost:3000'));

server.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('message', (data) => {
    console.log('message:', data);
    socket.emit('message:ack', 'received');
  });
});
```

Client (browser or Node.js)
- Create a client pointing to your server URL.

```ts
import { SocketIOLikeClient } from 'ws-socketio-adapter';

const socket = new SocketIOLikeClient('ws://localhost:3000');

socket.on('connect', () => {
  console.log('connected');
  socket.emit('message', 'Hello from client');
});

socket.on('message:ack', (msg) => {
  console.log('server ack:', msg);
});
```

Namespaces and Rooms
- Namespaces group sockets by URL path (e.g., /chat).
- Rooms allow targeted broadcast.

```ts
const chat = server.of('/chat');
chat.on('connection', (socket) => {
  socket.join('room-1');
  chat.to('room-1').emit('room:event', { text: 'Welcome!' });
});
```

Broadcast Operators
- Chain to(), in(), except() and call emit() to broadcast.
- compress(), timeout(), and properties local/volatile are chainable no-ops for compatibility.

```ts
server.to('room-1').except('room-2').emit('event', { x: 1 });
```

Project Scripts
- Build: npm run build
- Test: npm test
- Lint: npm run lint
- Format: npm run format

Next Steps
- See API Reference for full details: ./api.md
- See Migration Guide to transition from Socket.IO: ./migration.md