# WS Socket.IO Adapter

A Socket.IO compatible WebSocket adapter that provides a complete Socket.IO-like API using native WebSockets.

## Features

- 100% Socket.IO API compatibility
- Native WebSocket performance
- TypeScript support with full type definitions
- Client and server implementations
- Room and namespace support
- Automatic reconnection
- Event-driven architecture

## Installation

```bash
npm install ws-socketio-adapter
```

## Quick Start

### Client Usage

```typescript
import { SocketIOLikeClient } from 'ws-socketio-adapter';

const socket = new SocketIOLikeClient('ws://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.emit('message', 'Hello Server!');
```

### Server Usage

```typescript
import { SocketIOLikeAdapter } from 'ws-socketio-adapter';

const server = new SocketIOLikeAdapter({ port: 3000 });

server.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('message', (data) => {
    console.log('Received:', data);
    socket.emit('response', 'Hello Client!');
  });
});
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## License

MIT