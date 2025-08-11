import { EventEmitter } from 'events';
import { Emitter } from '../Emitter.js';
import { logger, createLogger } from '../logger/index.js';
// Namespace class that provides isolated event handling and room management
export class Namespace extends EventEmitter {
    constructor(name) {
        super();
        this.sockets = new Map();
        this.rooms = new Map();
        this.middleware = [];
        this.eventMiddleware = [];
        this.name = name;
        this.emitter = new Emitter();
        this.logger = createLogger.namespace(name);
        this.logger.info('namespace_created', `Namespace created: ${name}`, {
            namespaceName: name,
        });
    }
    use(middleware) {
        // Check if it's event middleware (4 parameters) or connection middleware (2 parameters)
        if (middleware.length === 4) {
            this.eventMiddleware.push(middleware);
            logger.info(`Event middleware added to namespace ${this.name}`, {});
        }
        else {
            this.middleware.push(middleware);
            logger.info(`Connection middleware added to namespace ${this.name}`, {});
        }
        return this;
    }
    // Execute middleware chain for a socket
    async executeMiddleware(socket) {
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
    // Add a socket to this namespace
    async addSocket(socket) {
        try {
            // Verificar si ya existe un socket con este ID en el namespace
            if (this.sockets.has(socket.id)) {
                logger.warn(`Socket con ID duplicado ${socket.id} en namespace ${this.name}. Removiendo socket anterior.`, {});
                // Remover el socket anterior
                this.removeSocket(socket.id);
            }
            // Execute middleware chain
            await this.executeMiddleware(socket);
            // Add socket to namespace
            this.sockets.set(socket.id, socket);
            // Set namespace reference on socket
            socket.nsp = this;
            // Emit connection event on namespace
            this.emitter.emit('connection', socket);
            super.emit('connection', socket);
            logger.info(`Socket ${socket.id} added to namespace ${this.name}`, {});
        }
        catch (error) {
            logger.error(`Error adding socket ${socket.id} to namespace ${this.name}:`, error);
            // Emit connection error
            this.emitter.emit('connect_error', error, socket);
            super.emit('connect_error', error, socket);
            throw error;
        }
    }
    // Remove a socket from this namespace
    removeSocket(socketId) {
        const socket = this.sockets.get(socketId);
        if (socket) {
            // Remove from all rooms in this namespace
            this.rooms.forEach((roomSockets, roomName) => {
                if (roomSockets.has(socketId)) {
                    this.removeFromRoom(roomName, socketId);
                }
            });
            // Remove from namespace
            this.sockets.delete(socketId);
            logger.info(`Socket ${socketId} removed from namespace ${this.name}`, {});
        }
    }
    // Add socket to room within this namespace
    addToRoom(room, socketId) {
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }
        this.rooms.get(room).add(socketId);
        logger.info(`Socket ${socketId} added to room ${room} in namespace ${this.name}`, {});
    }
    // Remove socket from room within this namespace
    removeFromRoom(room, socketId) {
        const roomSockets = this.rooms.get(room);
        if (roomSockets) {
            roomSockets.delete(socketId);
            // Clean up empty rooms
            if (roomSockets.size === 0) {
                this.rooms.delete(room);
            }
            logger.info(`Socket ${socketId} removed from room ${room} in namespace ${this.name}`, {});
        }
    }
    // Get sockets in a specific room
    getSocketsInRoom(room) {
        const roomSockets = this.rooms.get(room);
        if (!roomSockets)
            return [];
        return Array.from(roomSockets)
            .map(id => this.sockets.get(id))
            .filter(socket => socket !== undefined);
    }
    // Emit to all sockets in this namespace
    emit(event, ...args) {
        this.sockets.forEach(socket => {
            if (socket.isAlive()) {
                socket.emit(event, ...args);
            }
        });
        return true;
    }
    // Create broadcast operator for room targeting
    to(room) {
        return this.createBroadcastOperator([room], []);
    }
    // Alias for to()
    in(room) {
        return this.to(room);
    }
    // Create broadcast operator with exclusions
    except(room) {
        return this.createBroadcastOperator([], [room]);
    }
    // Create a broadcast operator with include/exclude rooms
    createBroadcastOperator(includeRooms, excludeRooms) {
        const self = this;
        return {
            emit(event, ...args) {
                let targetSockets = new Set();
                if (includeRooms.length > 0) {
                    // Include sockets from specified rooms
                    includeRooms.forEach(room => {
                        const roomSockets = self.getSocketsInRoom(room);
                        roomSockets.forEach(socket => targetSockets.add(socket));
                    });
                }
                else {
                    // Include all sockets in namespace if no specific rooms
                    self.sockets.forEach(socket => targetSockets.add(socket));
                }
                // Exclude sockets from specified rooms
                excludeRooms.forEach(room => {
                    const roomSockets = self.getSocketsInRoom(room);
                    roomSockets.forEach(socket => targetSockets.delete(socket));
                });
                // Emit to target sockets
                targetSockets.forEach(socket => {
                    if (socket.isAlive()) {
                        socket.emit(event, ...args);
                    }
                });
                return true;
            },
            to(room) {
                const rooms = Array.isArray(room) ? room : [room];
                return self.createBroadcastOperator([...includeRooms, ...rooms], excludeRooms);
            },
            in(room) {
                const rooms = Array.isArray(room) ? room : [room];
                return self.createBroadcastOperator([...includeRooms, ...rooms], excludeRooms);
            },
            except(room) {
                const rooms = Array.isArray(room) ? room : [room];
                return self.createBroadcastOperator(includeRooms, [
                    ...excludeRooms,
                    ...rooms,
                ]);
            },
            compress: (compress) => self.createBroadcastOperator(includeRooms, excludeRooms),
            timeout: (timeout) => self.createBroadcastOperator(includeRooms, excludeRooms),
            volatile: self.createBroadcastOperator(includeRooms, excludeRooms),
            local: self.createBroadcastOperator(includeRooms, excludeRooms),
            // Enhanced methods for better control
            allSockets: async () => new Set(self.sockets.keys()),
            socketsJoin: (room) => {
                const rooms = Array.isArray(room) ? room : [room];
                // Implementation would join all sockets to rooms
            },
            socketsLeave: (room) => {
                const rooms = Array.isArray(room) ? room : [room];
                // Implementation would remove all sockets from rooms
            },
            disconnectSockets: (close) => {
                self.sockets.forEach(socket => socket.disconnect());
            },
            fetchSockets: async () => Array.from(self.sockets.values()),
        };
    }
    // Override EventEmitter methods to use custom emitter
    on(event, callback) {
        this.emitter.on(event, callback);
        return this;
    }
    once(event, callback) {
        this.emitter.once(event, callback);
        return this;
    }
    off(event, callback) {
        if (callback) {
            this.emitter.off(event, callback);
        }
        else {
            this.emitter.removeAllListeners(event);
        }
        return this;
    }
    // Get namespace statistics
    getStats() {
        const rooms = {};
        this.rooms.forEach((sockets, roomName) => {
            rooms[roomName] = sockets.size;
        });
        return {
            name: this.name,
            socketCount: this.sockets.size,
            roomCount: this.rooms.size,
            rooms,
            middlewareCount: this.middleware.length,
            eventMiddlewareCount: this.eventMiddleware.length,
        };
    }
}
//# sourceMappingURL=Namespace.js.map