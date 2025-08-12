// Main exports for the ws-socketio-adapter library
export { Emitter } from './Emitter.js';
export { SocketIOLikeClient } from './client/ws-adapter.js';
export { SocketIOLikeServer, SocketIOLikeSocket, wsio, Namespace } from './server/SocketIOLikeAdapter.js';
export * from './logger/index.js';
// Re-export subpath entrypoints for convenience
export * as client from './client.js';
export * as server from './server.js';
//# sourceMappingURL=index.js.map