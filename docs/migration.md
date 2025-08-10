# Migration Guide: Socket.IO to WS Socket.IO Adapter

This guide helps you port applications written for Socket.IO to this adapter with minimal friction.

Overview
- This library mirrors common Socket.IO concepts: namespaces, rooms, events, and broadcast operators.
- Some APIs are no-ops for compatibility (compress, timeout, volatile, local) and are safe to chain.

Key Differences
- Transport: Uses native WebSocket (via `ws`) rather than Engine.IO. No long-polling fallback.
- Server emit vs broadcast: server.emit triggers server listeners only; broadcasting requires `server.to(...).emit(...)` or `socket.broadcast.emit(...)`.
- Middleware: Supports connection and event middleware signatures; ensure your middlewares do not rely on Engine.IO specifics.
- Acks: This adapter supports event callbacks; ensure your client/server agree on callback usage.
- Rooms metadata: Rooms can track metadata via `setRoomMetadata/getRoomMetadata`.

Server Migration
- Creating the server
  - Socket.IO: `const io = new Server(httpServer)`
  - Adapter: `const io = new SocketIOLikeServer(); io.attach(httpServer);`

- Connection event
  - Socket.IO: `io.on('connection', (socket) => { ... })`
  - Adapter: `io.on('connection', (socket) => { ... })` (same)

- Namespaces
  - Socket.IO: `io.of('/chat')`
  - Adapter: `io.of('/chat')` (same)

- Rooms
  - Socket.IO: `socket.join('room1'); io.to('room1').emit('msg')`
  - Adapter: `socket.join('room1'); io.to('room1').emit('msg')` (same)

- Broadcast
  - Socket.IO: `socket.broadcast.to('room1').emit('msg')`
  - Adapter: `socket.broadcast.to('room1').emit('msg')` (same)

- Middleware
  - Socket.IO: `io.use((socket, next) => next())`
  - Adapter: `io.use((socket, next) => next())` (same) and event middleware: `(socket, event, data, next)`

- Disconnect
  - Socket.IO: `socket.disconnect()`
  - Adapter: `socket.disconnect()` (same)

Client Migration
- Creating client
  - Socket.IO: `io('ws://localhost:3000', { transports: ['websocket'] })`
  - Adapter: `new SocketIOLikeClient('ws://localhost:3000')`

- Events & acks
  - Socket.IO: `socket.emit('event', data, (ack) => ...)`
  - Adapter: `socket.emit('event', data, (ack) => ...)` (same)

- Reconnection
  - Socket.IO: built-in reconnection with options
  - Adapter: supports reconnection options but relies on WebSocket; behavior may differ slightly.

Compatibility Tips
- If you relied on HTTP long-polling, there is no fallback here.
- If you used namespaces authorization middleware, port as `io.of('/ns').use((socket, next) => ...)`.
- If you used server-level emit for broadcasting, update to use broadcast operators.

Testing
- Run `npm test` to ensure parity.
- Update tests to use `SocketIOLikeServer` and `SocketIOLikeClient` where appropriate.

Troubleshooting
- "Maximum call stack size exceeded" in broadcast usage: ensure your app uses chainable operators without creating recursive instances; update to latest version (fixed).
- `once` handlers called twice: update to latest version (fixed).
- `close` callback not firing: update to latest version (fixed).