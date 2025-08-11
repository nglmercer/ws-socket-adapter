import { EventEmitter } from 'events';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { type ISocket } from '../types';
import { ParsedUrlQuery } from 'querystring';
import * as url from 'url';
import { nanoid } from 'nanoid';
import { logger, createLogger } from '../logger/index.js';
import { Emitter } from '../Emitter.js';
import { Namespace } from './Namespace.js';

// Enhanced interface for broadcast operator with better typing
interface BroadcastOperator {
  emit(event: string, ...args: any[]): boolean;
  to(room: string | string[]): BroadcastOperator;
  in(room: string | string[]): BroadcastOperator;
  except(room: string | string[]): BroadcastOperator;
  compress(compress: boolean): BroadcastOperator;
  timeout(timeout: number): BroadcastOperator;
  volatile: BroadcastOperator;
  local: BroadcastOperator;
}

// Enhanced interface for connected user with additional metadata
interface ConnectedUser {
  id: string;
  socket: SocketIOLikeSocket;
  joinedAt: number;
  rooms: Set<string>;
  data?: any;
  // Enhanced properties
  lastActivity: number;
  connectionState: 'connecting' | 'connected' | 'disconnecting' | 'disconnected';
  transport: 'websocket' | 'polling';
  handshake: {
    query: Record<string, any>;
    headers: Record<string, string>;
    auth?: any;
    time: string;
    issued: number;
    url: string;
    address: string;
    xdomain: boolean;
    secure: boolean;
  };
  // Connection statistics
  stats?: {
    messagesReceived: number;
    messagesSent: number;
    bytesReceived: number;
    bytesSent: number;
    errors: number;
    reconnections: number;
  };
}

// Enhanced interface for room metadata with additional properties
interface RoomMetadata {
  name: string;
  createdAt: number;
  userCount: number;
  users: Set<string>;
  metadata?: any;
  // Enhanced properties
  maxUsers?: number;
  isPrivate?: boolean;
  owner?: string;
  description?: string;
  tags?: string[];
  // Room statistics
  stats?: {
    totalMessages: number;
    totalUsers: number;
    peakUsers: number;
    lastActivity: number;
    averageSessionDuration: number;
  };
  // Room configuration
  config?: {
    allowAnonymous?: boolean;
    requireAuth?: boolean;
    messageHistory?: boolean;
    maxMessageHistory?: number;
    rateLimiting?: {
      maxMessages: number;
      windowMs: number;
    };
  };
}

// Clase principal que emula Socket.IO usando WebSocket nativo
export class SocketIOLikeSocket extends EventEmitter implements ISocket {
  id: string;
  handshake: {
    query: ParsedUrlQuery;
  };
  conn: {
    transport: {
      name: string;
    };
  };
  private ws: WebSocket;
  private lastActivity: number = Date.now();
  private connectionStartTime: number = Date.now();
  private emitter: Emitter;
  private rooms: Set<string> = new Set();
  private server: SocketIOLikeServer;
  private namespace: Namespace;
  public isConnected: boolean = false;

  broadcast: {
    emit: (event: string, ...args: any[]) => void;
    to: (room: string) => { emit: (event: string, ...args: any[]) => void };
  };

  constructor(ws: WebSocket, request: any, server: SocketIOLikeServer, namespace: Namespace) {
    super();
    this.ws = ws;
    this.server = server;
    this.namespace = namespace;
    this.emitter = new Emitter();
    
    // Generar ID único usando el método del servidor
    this.id = server.generateUniqueId();
    logger.debug(`Socket creado con ID único: ${this.id}`, {});

    //  query params
    const parsedUrl = url.parse(request.url || '', true);
    this.handshake = {
      query: parsedUrl.query,
    };

    this.conn = {
      transport: {
        name: 'websocket',
      },
    };

    this.broadcast = {
      emit: (event: string, ...args: any[]) => {
        this.server.broadcastToAll(event, args, this.id);
      },
      to: (room: string) => ({
        emit: (event: string, ...args: any[]) => {
          this.server.broadcastToRoom(room, event, args, this.id);
        },
      }),
    };

    this.isConnected = true;

    this.setupWebSocketListeners();

    this.server.registerUser(this);
  }

  // Execute event middleware chain (with optional middleware support)
  private async executeEventMiddleware(event: string, data: any[]): Promise<void> {
    // Check if event middleware is enabled on server
    const serverUseEventMiddleware = (this.server as any).useEventMiddleware;
    if (!serverUseEventMiddleware) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const serverEventMiddleware = (this.server as any).eventMiddleware || [];
      const namespaceEventMiddleware = (this.namespace as any).eventMiddleware || [];
      const allMiddleware = [...serverEventMiddleware, ...namespaceEventMiddleware];
      
      // Skip if no middleware to execute
      if (allMiddleware.length === 0) {
        resolve();
        return;
      }
      
      let index = 0;

      const next = (err?: Error) => {
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
        } catch (error) {
          reject(error);
        }
      };

      next();
    });
  }

  private setupWebSocketListeners(): void {
    this.ws.on('message', (message: RawData) => {
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
          let callback: Function | undefined;
          if (data.callbackId) {
            callback = (...args: any[]) => {
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
      } catch (error) {
        logger.error('Error al parsear mensaje de WS:', error);
      }
    });

    // Manejar desconexión
    this.ws.on('close', (code: number, reason: Buffer) => {
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

    this.ws.on('error', (err: Error) => {
      this.isConnected = false;
      logger.error(`Error en WebSocket ${this.id}:`, err);
      this.server.unregisterUser(this.id);
      this.emitter.emit('disconnect');
      super.emit('disconnect');
    });

    // Manejar ping/pong
    this.ws.on('ping', (data: Buffer) => {
      this.lastActivity = Date.now();
      if (this.isConnected) {
        this.ws.pong(data);
      }
    });

    this.ws.on('pong', (data: Buffer) => {
      this.lastActivity = Date.now();
      this.emitter.emit('pong', data);
      super.emit('pong', data);
    });
  }

  // Método on usando el emitter personalizado
  on(event: string, callback: (data: any) => void): this {
    this.emitter.on(event, callback);
    return this;
  }

  // Método once usando el emitter personalizado
  once(event: string, callback: (data: any) => void): this {
    this.emitter.once(event, callback);
    return this;
  }

  // Método off usando el emitter personalizado
  off(event: string, callback?: (data: any) => void): this {
    if (callback) {
      this.emitter.off(event, callback);
    } else {
      this.emitter.removeAllListeners(event);
    }
    return this;
  }

  // Método emit para enviar datos al cliente (with graceful degradation)
  emit(event: string, ...args: any[]): boolean {
    if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn(`Intento de envío a WebSocket ${this.id} desconectado`, {
        data: event,
      });
      return false;
    }

    try {
      // Intentar envío normal
      return this.sendMessage(event, args);
    } catch (error: any) {
      // Fallback a método simple para mejor compatibilidad
      logger.warn(`Fallback to simple emit for ${this.id}`, { event, error: error.message });
      return this.sendSimpleMessage(event, args);
    }
  }

  // Método de envío normal
  private sendMessage(event: string, args: any[]): boolean {
    const message = JSON.stringify({
      event,
      payload: args,
    });
    this.ws.send(message);
    this.lastActivity = Date.now();
    return true;
  }

  // Método de envío simple como fallback
  private sendSimpleMessage(event: string, args: any[]): boolean {
    try {
      // Formato más simple para mejor compatibilidad
      const simpleMessage = JSON.stringify({
        type: event,
        data: args.length === 1 ? args[0] : args
      });
      this.ws.send(simpleMessage);
      this.lastActivity = Date.now();
      return true;
    } catch (error) {
      logger.error(`Error en fallback emit para WS ${this.id}:`, error);
      this.isConnected = false;
      return false;
    }
  }

  // Unirse a una sala
  join(room: string): this {
    this.rooms.add(room);
    this.server.addToRoom(room, this.id);
    this.namespace.addToRoom(room, this.id);
    logger.info(`Socket ${this.id} se unió a la sala ${room}`, {});
    return this;
  }

  // Salir de una sala
  leave(room: string): this {
    this.rooms.delete(room);
    this.server.removeFromRoom(room, this.id);
    this.namespace.removeFromRoom(room, this.id);
    logger.info(`Socket ${this.id} salió de la sala ${room}`, {});
    return this;
  }

  // Obtener salas del socket
  getRooms(): string[] {
    return Array.from(this.rooms);
  }

  // Join room with metadata
  joinWithMetadata(room: string, metadata?: any): this {
    this.join(room);
    if (metadata) {
      this.server.setRoomMetadata(room, metadata);
    }
    return this;
  }

  // Get room metadata
  getRoomMetadata(room: string): any {
    const metadata = this.server.getRoomMetadata(room);
    return metadata?.metadata;
  }

  // Check if socket is in room
  inRoom(room: string): boolean {
    return this.rooms.has(room);
  }

  // Emitir a una sala específica
  to(room: string): BroadcastOperator {
    const self = this;
    return {
      emit: (event: string, ...args: any[]) => {
        self.server.broadcastToRoom(room, event, args, self.id);
        return true;
      },
      to: (nextRoom: string | string[]) => self.to(Array.isArray(nextRoom) ? nextRoom[0] : nextRoom),
      in: (nextRoom: string | string[]) => self.to(Array.isArray(nextRoom) ? nextRoom[0] : nextRoom),
      except: (excludeRoom: string | string[]) => self.except(Array.isArray(excludeRoom) ? excludeRoom[0] : excludeRoom),
      compress: (compress: boolean) => self.to(room),
      timeout: (timeout: number) => self.to(room),
      volatile: self.to(room),
      local: self.to(room)
    };
  }

  // Alias for to()
  in(room: string): BroadcastOperator {
    return this.to(room);
  }

  // Broadcast to all except specific room
  except(room: string): BroadcastOperator {
    const self = this;
    return {
      emit: (event: string, ...args: any[]) => {
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
      to: (nextRoom: string | string[]) => self.to(Array.isArray(nextRoom) ? nextRoom[0] : nextRoom),
      in: (nextRoom: string | string[]) => self.to(Array.isArray(nextRoom) ? nextRoom[0] : nextRoom),
      except: (excludeRoom: string | string[]) => self.except(Array.isArray(excludeRoom) ? excludeRoom[0] : excludeRoom),
      compress: (compress: boolean) => self.except(room),
      timeout: (timeout: number) => self.except(room),
      volatile: self.except(room),
      local: self.except(room)
    };
  }

  // Método disconnect
  disconnect(): this {
    if (this.isConnected) {
      this.isConnected = false;
      try {
        this.ws.close(1000, 'Normal closure');
      } catch (error) {
        logger.error(`Error cerrando WebSocket ${this.id}:`, error);
      }
    }
    return this;
  }

  // Ping nativo
  ping(data?: Buffer): void {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.ping(data);
        this.lastActivity = Date.now();
      } catch (error) {
        logger.error(`Error enviando ping a WebSocket ${this.id}:`, error);
      }
    }
  }

  // Información de conexión
  getConnectionInfo(): {
    id: string;
    isConnected: boolean;
    readyState: number;
    lastActivity: number;
    connectionDuration: number;
    rooms: string[];
  } {
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
  isAlive(): boolean {
    return this.isConnected && this.ws.readyState === WebSocket.OPEN;
  }

  // Compatibilidad con socket.io
  get nsp(): Namespace {
    return this.namespace;
  }
  set nsp(value: Namespace) {
    // Permitir que el Namespace establezca su referencia en este socket (compatibilidad con Socket.IO)
    this.namespace = value;
  }
}

// Servidor principal que maneja múltiples conexiones
export class SocketIOLikeServer extends EventEmitter {
  private users: Map<string, ConnectedUser> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private roomMetadata: Map<string, RoomMetadata> = new Map();
  private emitter: Emitter;
  private wss?: WebSocketServer;
  private namespaces: Map<string, Namespace> = new Map();
  private defaultNamespace: Namespace;
  private middleware: Array<(socket: SocketIOLikeSocket, next: (err?: Error) => void) => void> = [];
  private eventMiddleware: Array<(socket: SocketIOLikeSocket, event: string, data: any[], next: (err?: Error) => void) => void> = [];
  private useMiddleware: boolean = false;
  public useEventMiddleware: boolean = false;
  public logger = createLogger.server();

  constructor() {
    super();
    this.emitter = new Emitter();
    
    this.logger.info('server_created', 'SocketIO-like server created');
    
    // Create default namespace
    this.defaultNamespace = new Namespace('/');
    this.namespaces.set('/', this.defaultNamespace);
    
    this.logger.debug('default_namespace_created', 'Default namespace created', {
      namespaceName: '/'
    });
  }

  // Enable maximum compatibility mode (disables complex features)
  enableMaxCompatibility(): this {
    this.useMiddleware = false;
    this.useEventMiddleware = false;
    this.logger.info('Maximum compatibility mode enabled - middleware disabled', {});
    return this;
  }

  // Enable full features mode (enables all features)
  enableFullFeatures(): this {
    this.useMiddleware = true;
    this.useEventMiddleware = true;
    this.logger.info('Full features mode enabled - all middleware enabled', {});
    return this;
  }

  // Inicializar servidor WebSocket con puerto específico
  listen(port: number, callback?: () => void): void {
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

  attach(server: any, callback?: () => void): void {
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

  private setupWebSocketServer(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, request: any) => {
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
          if (!namespace)return;
          namespace.addSocket(socket)})
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

  // Enable/disable middleware for better compatibility
  enableMiddleware(): this {
    this.useMiddleware = true;
    logger.info('Connection middleware enabled', {});
    return this;
  }

  enableEventMiddleware(): this {
    this.useEventMiddleware = true;
    logger.info('Event middleware enabled', {});
    return this;
  }

  disableMiddleware(): this {
    this.useMiddleware = false;
    logger.info('Connection middleware disabled', {});
    return this;
  }

  disableEventMiddleware(): this {
    this.useEventMiddleware = false;
    logger.info('Event middleware disabled', {});
    return this;
  }

  // Add middleware to server (applies to all namespaces)
  use(middleware: (socket: SocketIOLikeSocket, next: (err?: Error) => void) => void): this;
  use(middleware: (socket: SocketIOLikeSocket, event: string, data: any[], next: (err?: Error) => void) => void): this;
  use(middleware: any): this {
    // Check if it's event middleware (4 parameters) or connection middleware (2 parameters)
    if (middleware.length === 4) {
      this.eventMiddleware.push(middleware);
      this.useEventMiddleware = true; // Auto-enable when middleware is added
      logger.info('Server event middleware added and enabled', {});
    } else {
      this.middleware.push(middleware);
      this.useMiddleware = true; // Auto-enable when middleware is added
      logger.info('Server connection middleware added and enabled', {});
    }
    return this;
  }

  // Execute server middleware chain for a socket (with optional middleware support)
  private async executeServerMiddleware(socket: SocketIOLikeSocket): Promise<void> {
    // Skip middleware execution if disabled for better compatibility
    if (!this.useMiddleware || this.middleware.length === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let index = 0;

      const next = (err?: Error) => {
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
        } catch (error) {
          reject(error);
        }
      };

      next();
    });
  }

  // Get or create namespace
  of(namespaceName: string): Namespace {
    let namespace = this.namespaces.get(namespaceName);
    if (!namespace) {
      namespace = new Namespace(namespaceName);
      this.namespaces.set(namespaceName, namespace);
      logger.info(`Namespace created: ${namespaceName}`, {});
    }
    return namespace;
  }

  // Verificar si un ID está disponible (thread-safe mejorado)
  private isIdAvailable(id: string): boolean {
    return !this.users.has(id);
  }

  // Generar ID único garantizado con fallback
  public generateUniqueId(): string {
    let id: string;
    let attempts = 0;
    
    do {
      id = nanoid();
      attempts++;
      
      // Evitar loops infinitos con fallback timestamp
      if (attempts > 10) {
        id = `${nanoid()}-${Date.now()}`;
        logger.warn('ID generation fallback used', { attempts, finalId: id });
        break;
      }
    } while (!this.isIdAvailable(id));
    
    return id;
  }

  // Método simple para verificar existencia de usuario
  public hasUser(id: string): boolean {
    return this.users.has(id);
  }

  // Registrar usuario
  registerUser(socket: SocketIOLikeSocket): void {
    // Verificar si ya existe un usuario con este ID
    if (this.users.has(socket.id)) {
      logger.warn(
        `Intento de registrar usuario con ID duplicado: ${socket.id}. Desregistrando usuario anterior.`,
        {}
      );
      // Desregistrar el usuario anterior
      this.unregisterUser(socket.id);
    }

    const user: ConnectedUser = {
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
    logger.info(
      `Usuario registrado: ${socket.id}. Total usuarios: ${this.users.size}`,
      {}
    );
    
    // Emitir evento de confirmación de registro exitoso
    socket.emit('user-registered', {
      id: socket.id,
      timestamp: Date.now(),
      totalUsers: this.users.size
    });
  }

  // Desregistrar usuario
  unregisterUser(socketId: string): void {
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
      logger.info(
        `Usuario desregistrado: ${socketId}. Total usuarios: ${this.users.size}`,
        {}
      );
    }
  }

  // Añadir a sala
  addToRoom(room: string, socketId: string): void {
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

    this.rooms.get(room)!.add(socketId);
    
    // Update room metadata
    const metadata = this.roomMetadata.get(room)!;
    metadata.users.add(socketId);
    metadata.userCount = metadata.users.size;

    const user = this.users.get(socketId);
    if (user) {
      user.rooms.add(room);
    }

    logger.info(`Socket ${socketId} added to room ${room}. Room now has ${metadata.userCount} users`, {});
  }

  // Remover de sala
  removeFromRoom(room: string, socketId: string): void {
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
      } else {
        logger.info(`Socket ${socketId} removed from room ${room}. Room now has ${roomUsers.size} users`, {});
      }
    }

    const user = this.users.get(socketId);
    if (user) {
      user.rooms.delete(room);
    }
  }

  // Broadcast a todos los usuarios
  broadcastToAll(event: string, args: any[], excludeId?: string): void {
    this.users.forEach((user, id) => {
      if (id !== excludeId && user.socket.isAlive()) {
        user.socket.emit(event, ...args);
      }
    });
  }

  // Broadcast a una sala específica
  broadcastToRoom(
    room: string,
    event: string,
    args: any[],
    excludeId?: string
  ): void {
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
  on(event: string, callback: (data: any) => void): this {
    this.emitter.on(event, callback);
    super.on(event, callback);
    return this;
  }

  once(event: string, callback: (data: any) => void): this {
    // Use only one emitter for 'once' to avoid double calls
    super.once(event, callback);
    return this;
  }

  off(event: string, callback?: (data: any) => void): this {
    if (callback) {
      this.emitter.off(event, callback);
      super.off(event, callback);
    } else {
      this.emitter.removeAllListeners(event);
      super.removeAllListeners(event);
    }
    return this;
  }

  // Create broadcast operator for advanced room operations
  to(room: string): BroadcastOperator {
    return this.createBroadcastOperator([room], []);
  }

  // Alias for to()
  in(room: string): BroadcastOperator {
    return this.createBroadcastOperator([room], []);
  }

  // Create broadcast operator with exclusions
  except(room: string): BroadcastOperator {
    return this.createBroadcastOperator([], [room]);
  }

  // Create a broadcast operator with include/exclude rooms
  private createBroadcastOperator(includeRooms: string[], excludeRooms: string[]): BroadcastOperator {
    const self = this;

    const emitImpl = (event: string, ...args: any[]): boolean => {
      const targetUsers: Set<ConnectedUser> = new Set();

      if (includeRooms.length > 0) {
        includeRooms.forEach(room => {
          const roomUsers = self.getUsersInRoom(room);
          roomUsers.forEach(user => targetUsers.add(user));
        });
      } else {
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

    const toImpl = (room: string | string[]): BroadcastOperator => {
      const rooms = Array.isArray(room) ? room : [room];
      return self.createBroadcastOperator([...includeRooms, ...rooms], excludeRooms);
    };

    const inImpl = (room: string | string[]): BroadcastOperator => {
      const rooms = Array.isArray(room) ? room : [room];
      return self.createBroadcastOperator([...includeRooms, ...rooms], excludeRooms);
    };

    const exceptImpl = (room: string | string[]): BroadcastOperator => {
      const rooms = Array.isArray(room) ? room : [room];
      return self.createBroadcastOperator(includeRooms, [...excludeRooms, ...rooms]);
    };

    const operator: any = {
      emit: emitImpl,
      to: toImpl,
      in: inImpl,
      except: exceptImpl,
      // Return the same operator instance for chainability without creating new ones
      compress: (_compress: boolean) => operator,
      timeout: (_timeout: number) => operator,
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

    return operator as BroadcastOperator;
  }

  // Emitir a todos los usuarios conectados y también emitir en el servidor
  emit(event: string, ...args: any[]): boolean {
    // Emit on server's EventEmitter for server events
    super.emit(event, ...args);
    // Also emit to custom emitter
    this.emitter.emit(event, ...args);
    // Don't broadcast to all users for server events
    return true;
  }

  // Obtener estadísticas del servidor
  getStats(): {
    totalUsers: number;
    totalRooms: number;
    totalNamespaces: number;
    serverMiddlewareCount: number;
    serverEventMiddlewareCount: number;
    users: Array<{
      id: string;
      joinedAt: number;
      rooms: string[];
      isAlive: boolean;
      namespace: string;
    }>;
    rooms: Record<string, number>;
    roomsWithMetadata: Record<string, {
      userCount: number;
      createdAt: number;
      metadata: any;
    }>;
    namespaces: Record<string, {
      socketCount: number;
      roomCount: number;
      rooms: Record<string, number>;
      middlewareCount: number;
      eventMiddlewareCount: number;
    }>;
  } {
    const users = Array.from(this.users.values()).map(user => ({
      id: user.id,
      joinedAt: user.joinedAt,
      rooms: Array.from(user.rooms),
      isAlive: user.socket.isAlive(),
      namespace: user.socket.nsp?.name || '/',
    }));

    const rooms: Record<string, number> = {};
    this.rooms.forEach((users, room) => {
      rooms[room] = users.size;
    });

    const roomsWithMetadata: Record<string, any> = {};
    this.roomMetadata.forEach((metadata, room) => {
      roomsWithMetadata[room] = {
        userCount: metadata.userCount,
        createdAt: metadata.createdAt,
        metadata: metadata.metadata
      };
    });

    const namespaces: Record<string, any> = {};
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
  getUser(socketId: string): ConnectedUser | undefined {
    return this.users.get(socketId);
  }

  // Get all users (for internal use)
  getAllUsers(): Map<string, ConnectedUser> {
    return this.users;
  }

  // Obtener usuarios en una sala
  getUsersInRoom(room: string): ConnectedUser[] {
    const roomUsers = this.rooms.get(room);
    if (!roomUsers) return [];

    return Array.from(roomUsers)
      .map(id => this.users.get(id))
      .filter(user => user !== undefined) as ConnectedUser[];
  }

  // Get room metadata
  getRoomMetadata(room: string): RoomMetadata | undefined {
    return this.roomMetadata.get(room);
  }

  // Set room metadata
  setRoomMetadata(room: string, metadata: any): void {
    const roomMeta = this.roomMetadata.get(room);
    if (roomMeta) {
      roomMeta.metadata = { ...roomMeta.metadata, ...metadata };
      logger.info(`Room ${room} metadata updated`, {});
    }
  }

  // Get all rooms with metadata
  getAllRooms(): Array<RoomMetadata> {
    return Array.from(this.roomMetadata.values());
  }

  // Check if room exists
  hasRoom(room: string): boolean {
    return this.rooms.has(room);
  }

  // Get room user count
  getRoomUserCount(room: string): number {
    const roomUsers = this.rooms.get(room);
    return roomUsers ? roomUsers.size : 0;
  }

  // Cerrar servidor
  close(callback?: () => void): void {
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
        if (callback) callback();
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
    if (callback) callback();
  }
}

// Instancia global del servidor
export const wsio = new SocketIOLikeServer();

// Exportar tipos
export type { ConnectedUser, RoomMetadata, BroadcastOperator };
export { Namespace };
