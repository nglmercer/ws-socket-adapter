# API Reference

This document summarizes the main public APIs available in this package. Refer to the source files for full details.

Server API
- Class: SocketIOLikeServer (src/server/SocketIOLikeAdapter.ts)
  - listen(port: number, callback?): void
  - attach(server: any, callback?): void
  - use(middleware): this
    - (socket, next) => void for connection middleware
    - (socket, event, data, next) => void for event middleware
  - of(namespaceName: string): Namespace
  - on(event: string, cb): this
  - once(event: string, cb): this
  - off(event: string, cb?): this
  - emit(event: string, ...args): boolean
  - to(room: string): BroadcastOperator
  - in(room: string): BroadcastOperator
  - except(room: string): BroadcastOperator
  - broadcastToAll(event: string, args: any[], excludeId?): void
  - broadcastToRoom(room: string, event: string, args: any[], excludeId?): void
  - registerUser(socket): void
  - unregisterUser(socketId: string): void
  - addToRoom(room: string, socketId: string): void
  - removeFromRoom(room: string, socketId: string): void
  - getUser(socketId: string)
  - getAllUsers(): Map
  - getUsersInRoom(room: string): ConnectedUser[]
  - getRoomMetadata(room: string)
  - setRoomMetadata(room: string, metadata: any)
  - hasRoom(room: string): boolean
  - getAllRooms(): RoomMetadata[]
  - getRoomUserCount(room: string): number
  - getStats(): { totalUsers, totalRooms, totalNamespaces, ... }
  - close(callback?): void

- Class: Namespace (src/server/Namespace.ts)
  - name: string
  - sockets: Map<string, SocketIOLikeSocket>
  - use(middleware): this
  - addSocket(socket): Promise<void>
  - removeSocket(socketId: string): void
  - addToRoom(room: string, socketId: string): void
  - removeFromRoom(room: string, socketId: string): void
  - getSocketsInRoom(room: string): SocketIOLikeSocket[]
  - to(room: string): BroadcastOperator
  - in(room: string): BroadcastOperator
  - except(room: string): BroadcastOperator
  - emit(event: string, ...args): boolean
  - on/once/off(event, cb)
  - getStats(): { name, socketCount, roomCount, rooms, middlewareCount, eventMiddlewareCount }

- Class: SocketIOLikeSocket (src/server/SocketIOLikeAdapter.ts)
  - id: string
  - handshake: { query: ParsedUrlQuery }
  - conn.transport.name: string
  - broadcast: { emit(event, ...args), to(room).emit(event, ...args) }
  - on(event, cb): this
  - once(event, cb): this
  - off(event, cb?): this
  - emit(event, ...args): boolean
  - join(room): this
  - leave(room): this
  - getRooms(): string[]
  - joinWithMetadata(room, metadata?): this
  - getRoomMetadata(room): any
  - inRoom(room): boolean
  - to(room): BroadcastOperator
  - in(room): BroadcastOperator
  - except(room): BroadcastOperator
  - disconnect(): this
  - ping(data?): void
  - getConnectionInfo(): { id, isConnected, readyState, lastActivity, connectionDuration, rooms }
  - isAlive(): boolean
  - nsp: Namespace

BroadcastOperator
- Methods: emit(event, ...args): boolean; to(room), in(room), except(room) for chaining; compress(boolean); timeout(number); properties volatile and local for chainability.
- Behavior: Scopes targets by include/exclude rooms. compress/timeout/volatile/local are no-ops for compatibility but allow API chaining.

Client API
- Class: SocketIOLikeClient (src/client/ws-adapter.ts)
  - constructor(url: string, options?: { query, transports, autoConnect, auth, forceNew, multiplex, reconnection, reconnectionAttempts, reconnectionDelay, reconnectionDelayMax, randomizationFactor, timeout, upgrade, rememberUpgrade, protocols, headers, compression, maxPayload, pingInterval, pongTimeout })
  - connect(): this
  - disconnect(): this
  - on(event, cb): this
  - once(event, cb): this
  - off(event, cb?): this
  - onAny(cb): this
  - offAny(cb?): this
  - emit(event, ...args): boolean
  - send(...args): this
  - compress(boolean): this
  - timeout(number): this
  - Properties: id, connected, disconnected
  - Diagnostics: clearCallbacks(eventFilter?), getPendingCallbacks(), setCallbackLimits(), getCallbackStats(), getReconnectionStats()

Types
- See src/types.ts for detailed generic Socket.IO-compatible types: EventMap, TypedEventEmitter, ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, SocketIOSocket, SocketIOClient, BroadcastOperator, ISocket, User, Room, CustomSocket.
- See src/types/enhanced.ts for enhanced unions and error types.

Events
- Common server events: 'connection', 'connect_error'.
- Socket events: user-defined string events; supports once and off.

Middleware
- Server.use: (socket, next) or (socket, event, data, next)
- Namespace.use: same signatures.

Notes
- The server’s emit() triggers server-level listeners and custom emitter; it does not broadcast to sockets automatically. Use broadcast operators for message fanout.