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
import { SocketIOLikeClient,defaultLogger } from 'ws-socketio-adapter';

const socket = new SocketIOLikeClient('ws://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.emit('message', 'Hello Server!');
```

### Server Usage

```typescript
import { SocketIOLikeServer, SocketIOLikeSocket, defaultLogger } from '../dist/index.js';

const server = new SocketIOLikeServer();
// internal logger, default level is 'info'
// you can update the logger config
defaultLogger.updateConfig({
  level: 'debug',
});
// silence the logger
defaultLogger.silence();

server.on('connection', (socket) => {
  defaultLogger.info('Client connected:', socket.id);

  socket.on('message', (data) => {
    console.log('Received:', data);
    socket.emit('response', 'Hello Client!'); 
  });

  socket.on('disconnect', () => {
   console.log('disconnected', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
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