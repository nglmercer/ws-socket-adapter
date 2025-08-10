import { EventEmitter } from 'events';
import { WebSocket, WebSocketServer } from 'ws';
import * as url from 'url';
import { nanoid } from 'nanoid';
import { logger, createLogger } from '../logger/index.js';
import { Emitter } from '../Emitter.js';
import { Namespace } from './Namespace.js';
// Clase principal que emula Socket.IO usando WebSocket nativo
export class SocketIOLikeSocket extends EventEmitter {
    constructor(ws, request, server, namespace) {
        super();
        this.isConnected = true;
        this.lastActivity = Date.now();
        this.connectionStartTime = Date.now();
        this.rooms = new Set();
        this.ws = ws;
        this.id = nanoid();
        this.server = server;
        this.namespace = namespace;
        this.emitter = new Emitter();
        // Extraer query params
        const parsedUrl = url.parse(request.url || '', true);
        this.handshake = {
            query: parsedUrl.query,
        };
        // Simular conn.transport para compatibilidad con Socket.IO
        this.conn = {
            transport: {
                name: 'websocket',
            },
        };
        // Configurar broadcast
        this.broadcast = {
            emit: (event, ...args) => {
                this.server.broadcastToAll(event, args, this.id);
            },
            to: (room) => ({
                emit: (event, ...args) => {
                    this.server.broadcastToRoom(room, event, args, this.id);
                },
            }),
        };
        this.setupWebSocketListeners();
        // Registrar usuario en el servidor
        this.server.registerUser(this);
    }
    // Execute event middleware chain
    async executeEventMiddleware(event, data) {
        return new Promise((resolve, reject) => {
            const serverEventMiddleware = this.server.eventMiddleware || [];
            const namespaceEventMiddleware = this.namespace.eventMiddleware || [];
            const allMiddleware = [...serverEventMiddleware, ...namespaceEventMiddleware];
            let index = 0;
            const next = (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (index >= allMiddleware.length) {
                    resolve();
                    return;
                }
                const middleware = allMiddleware[index++];
                try {
                    middleware(this, event, data, next);
                }
                catch (error) {
                    reject(error);
                }
            };
            next();
        });
    }
    setupWebSocketListeners() {
        // Manejar mensajes entrantes
        this.ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                console.log('data', data);
                if (data.event && Array.isArray(data.payload)) {
                    this.lastActivity = Date.now();
                    console.log('Mensaje entrante:', data.event, data.payload);
                    // Ignorar eventos de callback-response para evitar bucles
                    if (data.event === 'callback-response') {
                        return;
                    }
                    // Crear función de callback si hay callbackId
                    let callback;
                    if (data.callbackId) {
                        callback = (...args) => {
                            // Enviar respuesta del callback directamente al cliente
                            const callbackResponse = {
                                event: 'callback-response',
                                callbackId: data.callbackId,
                                payload: args,
                            };
                            if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
                                this.ws.send(JSON.stringify(callbackResponse));
                            }
                        };
                    }
                    // Preparar argumentos incluyendo callback si existe
                    const args = callback ? [...data.payload, callback] : data.payload;
                    // Execute event middleware before emitting
                    this.executeEventMiddleware(data.event, data.payload)
                        .then(() => {
                        // Emitir usando el emitter interno
                        this.emitter.emit(data.event, ...args);
                        // También emitir usando EventEmitter nativo para compatibilidad
                        super.emit(data.event, ...args);
                    })
                        .catch(error => {
                        logger.error(`Event middleware error for ${data.event}:`, error);
                        // Emit error event
                        this.emitter.emit('error', error);
                        super.emit('error', error);
                    });
                }
            }
            catch (error) {
                logger.error('Error al parsear mensaje de WS:', error);
            }
        });
        // Manejar desconexión
        this.ws.on('close', (code, reason) => {
            this.isConnected = false;
            const reasonString = reason.toString();
            logger.info(`WebSocket ${this.id} cerrado`, {
                code,
                reason: reasonString,
                duration: Date.now() - this.connectionStartTime,
            });
            // Limpiar del servidor
            this.server.unregisterUser(this.id);
            // Emitir evento de desconexión
            this.emitter.emit('disconnect', { code, reasonString });
            super.emit('disconnect', { code, reasonString });
        });
        this.ws.on('error', (err) => {
            this.isConnected = false;
            logger.error(`Error en WebSocket ${this.id}:`, err);
            this.server.unregisterUser(this.id);
            this.emitter.emit('disconnect');
            super.emit('disconnect');
        });
        // Manejar ping/pong
        this.ws.on('ping', (data) => {
            this.lastActivity = Date.now();
            if (this.isConnected) {
                this.ws.pong(data);
            }
        });
        this.ws.on('pong', (data) => {
            this.lastActivity = Date.now();
            this.emitter.emit('pong', data);
            super.emit('pong', data);
        });
    }
    // Método on usando el emitter personalizado
    on(event, callback) {
        this.emitter.on(event, callback);
        return this;
    }
    // Método once usando el emitter personalizado
    once(event, callback) {
        this.emitter.once(event, callback);
        return this;
    }
    // Método off usando el emitter personalizado
    off(event, callback) {
        if (callback) {
            this.emitter.off(event, callback);
        }
        else {
            this.emitter.removeAllListeners(event);
        }
        return this;
    }
    // Método emit para enviar datos al cliente
    emit(event, ...args) {
        if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN) {
            logger.warn(`Intento de envío a WebSocket ${this.id} desconectado`, {
                data: event,
            });
            return false;
        }
        try {
            const message = JSON.stringify({
                event,
                payload: args,
            });
            this.ws.send(message);
            this.lastActivity = Date.now();
            return true;
        }
        catch (error) {
            logger.error(`Error al enviar mensaje por WS ${this.id}:`, error);
            this.isConnected = false;
            return false;
        }
    }
    // Unirse a una sala
    join(room) {
        this.rooms.add(room);
        this.server.addToRoom(room, this.id);
        this.namespace.addToRoom(room, this.id);
        logger.info(`Socket ${this.id} se unió a la sala ${room}`, {});
        return this;
    }
    // Salir de una sala
    leave(room) {
        this.rooms.delete(room);
        this.server.removeFromRoom(room, this.id);
        this.namespace.removeFromRoom(room, this.id);
        logger.info(`Socket ${this.id} salió de la sala ${room}`, {});
        return this;
    }
    // Obtener salas del socket
    getRooms() {
        return Array.from(this.rooms);
    }
    // Join room with metadata
    joinWithMetadata(room, metadata) {
        this.join(room);
        if (metadata) {
            this.server.setRoomMetadata(room, metadata);
        }
        return this;
    }
    // Get room metadata
    getRoomMetadata(room) {
        const metadata = this.server.getRoomMetadata(room);
        return metadata?.metadata;
    }
    // Check if socket is in room
    inRoom(room) {
        return this.rooms.has(room);
    }
    // Emitir a una sala específica
    to(room) {
        const self = this;
        return {
            emit: (event, ...args) => {
                self.server.broadcastToRoom(room, event, args, self.id);
                return true;
            },
            to: (nextRoom) => self.to(Array.isArray(nextRoom) ? nextRoom[0] : nextRoom),
            in: (nextRoom) => self.to(Array.isArray(nextRoom) ? nextRoom[0] : nextRoom),
            except: (excludeRoom) => self.except(Array.isArray(excludeRoom) ? excludeRoom[0] : excludeRoom),
            compress: (compress) => self.to(room),
            timeout: (timeout) => self.to(room),
            volatile: self.to(room),
            local: self.to(room)
        };
    }
    // Alias for to()
    in(room) {
        return this.to(room);
    }
    // Broadcast to all except specific room
    except(room) {
        const self = this;
        return {
            emit: (event, ...args) => {
                // Get all users except those in the excluded room
                const excludedUsers = self.server.getUsersInRoom(room);
                const excludedIds = new Set(excludedUsers.map(user => user.id));
                self.server.getAllUsers().forEach((user, id) => {
                    if (id !== self.id && !excludedIds.has(id) && user.socket.isAlive()) {
                        user.socket.emit(event, ...args);
                    }
                });
                return true;
            },
            to: (nextRoom) => self.to(Array.isArray(nextRoom) ? nextRoom[0] : nextRoom),
            in: (nextRoom) => self.to(Array.isArray(nextRoom) ? nextRoom[0] : nextRoom),
            except: (excludeRoom) => self.except(Array.isArray(excludeRoom) ? excludeRoom[0] : excludeRoom),
            compress: (compress) => self.except(room),
            timeout: (timeout) => self.except(room),
            volatile: self.except(room),
            local: self.except(room)
        };
    }
    // Método disconnect
    disconnect() {
        if (this.isConnected) {
            this.isConnected = false;
            try {
                this.ws.close(1000, 'Normal closure');
            }
            catch (error) {
                logger.error(`Error cerrando WebSocket ${this.id}:`, error);
            }
        }
        return this;
    }
    // Ping nativo
    ping(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.ping(data);
                this.lastActivity = Date.now();
            }
            catch (error) {
                logger.error(`Error enviando ping a WebSocket ${this.id}:`, error);
            }
        }
    }
    // Información de conexión
    getConnectionInfo() {
        return {
            id: this.id,
            isConnected: this.isConnected,
            readyState: this.ws.readyState,
            lastActivity: this.lastActivity,
            connectionDuration: Date.now() - this.connectionStartTime,
            rooms: this.getRooms(),
        };
    }
    // Verificar si está vivo
    isAlive() {
        return this.isConnected && this.ws.readyState === WebSocket.OPEN;
    }
    // Compatibilidad con socket.io
    get nsp() {
        return this.namespace;
    }
    set nsp(value) {
        // Permitir que el Namespace establezca su referencia en este socket (compatibilidad con Socket.IO)
        this.namespace = value;
    }
}
// Servidor principal que maneja múltiples conexiones
export class SocketIOLikeServer extends EventEmitter {
    constructor() {
        super();
        this.users = new Map();
        this.rooms = new Map();
        this.roomMetadata = new Map();
        this.namespaces = new Map();
        this.middleware = [];
        this.eventMiddleware = [];
        this.logger = createLogger.server();
        this.emitter = new Emitter();
        this.logger.info('server_created', 'SocketIO-like server created');
        // Create default namespace
        this.defaultNamespace = new Namespace('/');
        this.namespaces.set('/', this.defaultNamespace);
        this.logger.debug('default_namespace_created', 'Default namespace created', {
            namespaceName: '/'
        });
    }
    // Inicializar servidor WebSocket con puerto específico
    listen(port, callback) {
        const startTime = Date.now();
        this.logger.info('server_listen_start', `Starting server on port ${port}`, { port });
        this.wss = new WebSocketServer({ port });
        this.setupWebSocketServer();
        if (callback) {
            callback();
        }
        const setupTime = Date.now() - startTime;
        this.logger.info('server_listening', `Server listening on port ${port}`, { port });
        this.logger.performance('server_startup', setupTime, { port });
    }
    // Inicializar servidor WebSocket usando un servidor HTTP existente
    attach(server, callback) {
        const startTime = Date.now();
        this.logger.info('server_attach_start', 'Attaching to existing HTTP server');
        this.wss = new WebSocketServer({ server });
        this.setupWebSocketServer();
        if (callback) {
            callback();
        }
        const setupTime = Date.now() - startTime;
        this.logger.info('server_attached', 'Server attached to HTTP server');
        this.logger.performance('server_attach', setupTime);
    }
    // Configurar eventos del servidor WebSocket (método privado compartido)
    setupWebSocketServer() {
        if (!this.wss)
            return;
        this.wss.on('connection', (ws, request) => {
            // Extract namespace from URL path
            const parsedUrl = url.parse(request.url || '', true);
            const namespaceName = parsedUrl.pathname || '/';
            // Get or create namespace
            let namespace = this.namespaces.get(namespaceName);
            if (!namespace) {
                namespace = new Namespace(namespaceName);
                this.namespaces.set(namespaceName, namespace);
            }
            const socket = new SocketIOLikeSocket(ws, request, this, namespace);
            logger.info(`Nueva conexión WebSocket: ${socket.id} en namespace ${namespaceName}`, {});
            // Execute server middleware first, then namespace middleware
            this.executeServerMiddleware(socket)
                .then(() => {
                if (!namespace)
                    return;
                namespace.addSocket(socket);
            })
                .then(() => {
                // Emitir evento de conexión en el servidor principal
                this.emitter.emit('connection', socket);
                super.emit('connection', socket);
            })
                .catch(error => {
                logger.error(`Error in middleware chain for socket ${socket.id}:`, error);
                // Emit connection error on server
                this.emitter.emit('connect_error', error, socket);
                super.emit('connect_error', error, socket);
                socket.disconnect();
            });
        });
    }
    use(middleware) {
        // Check if it's event middleware (4 parameters) or connection middleware (2 parameters)
        if (middleware.length === 4) {
            this.eventMiddleware.push(middleware);
            logger.info('Server event middleware added', {});
        }
        else {
            this.middleware.push(middleware);
            logger.info('Server connection middleware added', {});
        }
        return this;
    }
    // Execute server middleware chain for a socket
    async executeServerMiddleware(socket) {
        return new Promise((resolve, reject) => {
            let index = 0;
            const next = (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (index >= this.middleware.length) {
                    resolve();
                    return;
                }
                const middleware = this.middleware[index++];
                try {
                    middleware(socket, next);
                }
                catch (error) {
                    reject(error);
                }
            };
            next();
        });
    }
    // Get or create namespace
    of(namespaceName) {
        let namespace = this.namespaces.get(namespaceName);
        if (!namespace) {
            namespace = new Namespace(namespaceName);
            this.namespaces.set(namespaceName, namespace);
            logger.info(`Namespace created: ${namespaceName}`, {});
        }
        return namespace;
    }
    // Registrar usuario
    registerUser(socket) {
        const user = {
            id: socket.id,
            socket,
            joinedAt: Date.now(),
            rooms: new Set(),
            lastActivity: Date.now(),
            connectionState: 'connected',
            transport: 'websocket',
            handshake: {
                query: socket.handshake.query,
                headers: {},
                time: new Date().toISOString(),
                issued: Date.now(),
                url: '',
                address: '',
                xdomain: false,
                secure: false
            },
            stats: {
                messagesReceived: 0,
                messagesSent: 0,
                bytesReceived: 0,
                bytesSent: 0,
                errors: 0,
                reconnections: 0
            }
        };
        this.users.set(socket.id, user);
        logger.info(`Usuario registrado: ${socket.id}. Total usuarios: ${this.users.size}`, {});
    }
    // Desregistrar usuario
    unregisterUser(socketId) {
        const user = this.users.get(socketId);
        if (user) {
            // Remover de todas las salas
            user.rooms.forEach(room => {
                this.removeFromRoom(room, socketId);
            });
            // Remove from namespace
            const socket = user.socket;
            if (socket.nsp) {
                socket.nsp.removeSocket(socketId);
            }
            this.users.delete(socketId);
            logger.info(`Usuario desregistrado: ${socketId}. Total usuarios: ${this.users.size}`, {});
        }
    }
    // Añadir a sala
    addToRoom(room, socketId) {
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
            // Create room metadata
            this.roomMetadata.set(room, {
                name: room,
                createdAt: Date.now(),
                userCount: 0,
                users: new Set(),
                metadata: {}
            });
        }
        this.rooms.get(room).add(socketId);
        // Update room metadata
        const metadata = this.roomMetadata.get(room);
        metadata.users.add(socketId);
        metadata.userCount = metadata.users.size;
        const user = this.users.get(socketId);
        if (user) {
            user.rooms.add(room);
        }
        logger.info(`Socket ${socketId} added to room ${room}. Room now has ${metadata.userCount} users`, {});
    }
    // Remover de sala
    removeFromRoom(room, socketId) {
        const roomUsers = this.rooms.get(room);
        if (roomUsers) {
            roomUsers.delete(socketId);
            // Update room metadata
            const metadata = this.roomMetadata.get(room);
            if (metadata) {
                metadata.users.delete(socketId);
                metadata.userCount = metadata.users.size;
            }
            // Si la sala está vacía, eliminarla
            if (roomUsers.size === 0) {
                this.rooms.delete(room);
                this.roomMetadata.delete(room);
                logger.info(`Room ${room} deleted (empty)`, {});
            }
            else {
                logger.info(`Socket ${socketId} removed from room ${room}. Room now has ${roomUsers.size} users`, {});
            }
        }
        const user = this.users.get(socketId);
        if (user) {
            user.rooms.delete(room);
        }
    }
    // Broadcast a todos los usuarios
    broadcastToAll(event, args, excludeId) {
        this.users.forEach((user, id) => {
            if (id !== excludeId && user.socket.isAlive()) {
                user.socket.emit(event, ...args);
            }
        });
    }
    // Broadcast a una sala específica
    broadcastToRoom(room, event, args, excludeId) {
        const roomUsers = this.rooms.get(room);
        if (roomUsers) {
            roomUsers.forEach(userId => {
                if (userId !== excludeId) {
                    const user = this.users.get(userId);
                    if (user && user.socket.isAlive()) {
                        user.socket.emit(event, ...args);
                    }
                }
            });
        }
    }
    // Métodos de eventos usando emitter personalizado y EventEmitter nativo
    on(event, callback) {
        this.emitter.on(event, callback);
        super.on(event, callback);
        return this;
    }
    once(event, callback) {
        // Use only one emitter for 'once' to avoid double calls
        super.once(event, callback);
        return this;
    }
    off(event, callback) {
        if (callback) {
            this.emitter.off(event, callback);
            super.off(event, callback);
        }
        else {
            this.emitter.removeAllListeners(event);
            super.removeAllListeners(event);
        }
        return this;
    }
    // Create broadcast operator for advanced room operations
    to(room) {
        return this.createBroadcastOperator([room], []);
    }
    // Alias for to()
    in(room) {
        return this.createBroadcastOperator([room], []);
    }
    // Create broadcast operator with exclusions
    except(room) {
        return this.createBroadcastOperator([], [room]);
    }
    // Create a broadcast operator with include/exclude rooms
    createBroadcastOperator(includeRooms, excludeRooms) {
        const self = this;
        const emitImpl = (event, ...args) => {
            const targetUsers = new Set();
            if (includeRooms.length > 0) {
                includeRooms.forEach(room => {
                    const roomUsers = self.getUsersInRoom(room);
                    roomUsers.forEach(user => targetUsers.add(user));
                });
            }
            else {
                self.users.forEach(user => targetUsers.add(user));
            }
            excludeRooms.forEach(room => {
                const roomUsers = self.getUsersInRoom(room);
                roomUsers.forEach(user => targetUsers.delete(user));
            });
            targetUsers.forEach(user => {
                if (user.socket.isAlive()) {
                    user.socket.emit(event, ...args);
                }
            });
            return true;
        };
        const toImpl = (room) => {
            const rooms = Array.isArray(room) ? room : [room];
            return self.createBroadcastOperator([...includeRooms, ...rooms], excludeRooms);
        };
        const inImpl = (room) => {
            const rooms = Array.isArray(room) ? room : [room];
            return self.createBroadcastOperator([...includeRooms, ...rooms], excludeRooms);
        };
        const exceptImpl = (room) => {
            const rooms = Array.isArray(room) ? room : [room];
            return self.createBroadcastOperator(includeRooms, [...excludeRooms, ...rooms]);
        };
        const operator = {
            emit: emitImpl,
            to: toImpl,
            in: inImpl,
            except: exceptImpl,
            // Return the same operator instance for chainability without creating new ones
            compress: (_compress) => operator,
            timeout: (_timeout) => operator,
        };
        // Define volatile and local as getters to avoid eager recursive construction
        Object.defineProperty(operator, 'volatile', {
            get() { return operator; },
            enumerable: true,
        });
        Object.defineProperty(operator, 'local', {
            get() { return operator; },
            enumerable: true,
        });
        return operator;
    }
    // Emitir a todos los usuarios conectados y también emitir en el servidor
    emit(event, ...args) {
        // Emit on server's EventEmitter for server events
        super.emit(event, ...args);
        // Also emit to custom emitter
        this.emitter.emit(event, ...args);
        // Don't broadcast to all users for server events
        return true;
    }
    // Obtener estadísticas del servidor
    getStats() {
        const users = Array.from(this.users.values()).map(user => ({
            id: user.id,
            joinedAt: user.joinedAt,
            rooms: Array.from(user.rooms),
            isAlive: user.socket.isAlive(),
            namespace: user.socket.nsp?.name || '/',
        }));
        const rooms = {};
        this.rooms.forEach((users, room) => {
            rooms[room] = users.size;
        });
        const roomsWithMetadata = {};
        this.roomMetadata.forEach((metadata, room) => {
            roomsWithMetadata[room] = {
                userCount: metadata.userCount,
                createdAt: metadata.createdAt,
                metadata: metadata.metadata
            };
        });
        const namespaces = {};
        this.namespaces.forEach((namespace, name) => {
            const stats = namespace.getStats();
            namespaces[name] = {
                socketCount: stats.socketCount,
                roomCount: stats.roomCount,
                rooms: stats.rooms,
                middlewareCount: stats.middlewareCount,
                eventMiddlewareCount: stats.eventMiddlewareCount,
            };
        });
        return {
            totalUsers: this.users.size,
            totalRooms: this.rooms.size,
            totalNamespaces: this.namespaces.size,
            serverMiddlewareCount: this.middleware.length,
            serverEventMiddlewareCount: this.eventMiddleware.length,
            users,
            rooms,
            roomsWithMetadata,
            namespaces,
        };
    }
    // Obtener usuario por ID
    getUser(socketId) {
        return this.users.get(socketId);
    }
    // Get all users (for internal use)
    getAllUsers() {
        return this.users;
    }
    // Obtener usuarios en una sala
    getUsersInRoom(room) {
        const roomUsers = this.rooms.get(room);
        if (!roomUsers)
            return [];
        return Array.from(roomUsers)
            .map(id => this.users.get(id))
            .filter(user => user !== undefined);
    }
    // Get room metadata
    getRoomMetadata(room) {
        return this.roomMetadata.get(room);
    }
    // Set room metadata
    setRoomMetadata(room, metadata) {
        const roomMeta = this.roomMetadata.get(room);
        if (roomMeta) {
            roomMeta.metadata = { ...roomMeta.metadata, ...metadata };
            logger.info(`Room ${room} metadata updated`, {});
        }
    }
    // Get all rooms with metadata
    getAllRooms() {
        return Array.from(this.roomMetadata.values());
    }
    // Check if room exists
    hasRoom(room) {
        return this.rooms.has(room);
    }
    // Get room user count
    getRoomUserCount(room) {
        const roomUsers = this.rooms.get(room);
        return roomUsers ? roomUsers.size : 0;
    }
    // Cerrar servidor
    close(callback) {
        if (this.wss) {
            // If wss exists, ensure callback is invoked after cleanup too
            this.wss.close(() => {
                // Desconectar todos los usuarios
                this.users.forEach(user => {
                    user.socket.disconnect();
                });
                this.users.clear();
                this.rooms.clear();
                this.roomMetadata.clear();
                this.namespaces.clear();
                // Recreate default namespace
                this.defaultNamespace = new Namespace('/');
                this.namespaces.set('/', this.defaultNamespace);
                logger.info('Servidor SocketIO-like cerrado', {});
                if (callback)
                    callback();
            });
            return;
        }
        // Desconectar todos los usuarios
        this.users.forEach(user => {
            user.socket.disconnect();
        });
        this.users.clear();
        this.rooms.clear();
        this.roomMetadata.clear();
        this.namespaces.clear();
        // Recreate default namespace
        this.defaultNamespace = new Namespace('/');
        this.namespaces.set('/', this.defaultNamespace);
        logger.info('Servidor SocketIO-like cerrado', {});
        if (callback)
            callback();
    }
}
// Instancia global del servidor
export const wsio = new SocketIOLikeServer();
export { Namespace };
//# sourceMappingURL=SocketIOLikeAdapter.js.map