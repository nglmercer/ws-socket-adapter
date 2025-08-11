import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { type ISocket } from '../types';
import { ParsedUrlQuery } from 'querystring';
import { Namespace } from './Namespace.js';
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
interface ConnectedUser {
    id: string;
    socket: SocketIOLikeSocket;
    joinedAt: number;
    rooms: Set<string>;
    data?: any;
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
    stats?: {
        messagesReceived: number;
        messagesSent: number;
        bytesReceived: number;
        bytesSent: number;
        errors: number;
        reconnections: number;
    };
}
interface RoomMetadata {
    name: string;
    createdAt: number;
    userCount: number;
    users: Set<string>;
    metadata?: any;
    maxUsers?: number;
    isPrivate?: boolean;
    owner?: string;
    description?: string;
    tags?: string[];
    stats?: {
        totalMessages: number;
        totalUsers: number;
        peakUsers: number;
        lastActivity: number;
        averageSessionDuration: number;
    };
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
export declare class SocketIOLikeSocket extends EventEmitter implements ISocket {
    id: string;
    handshake: {
        query: ParsedUrlQuery;
    };
    conn: {
        transport: {
            name: string;
        };
    };
    private ws;
    private lastActivity;
    private connectionStartTime;
    private emitter;
    private rooms;
    private server;
    private namespace;
    isConnected: boolean;
    broadcast: {
        emit: (event: string, ...args: any[]) => void;
        to: (room: string) => {
            emit: (event: string, ...args: any[]) => void;
        };
    };
    constructor(ws: WebSocket, request: any, server: SocketIOLikeServer, namespace: Namespace);
    private executeEventMiddleware;
    private setupWebSocketListeners;
    on(event: string, callback: (data: any) => void): this;
    once(event: string, callback: (data: any) => void): this;
    off(event: string, callback?: (data: any) => void): this;
    emit(event: string, ...args: any[]): boolean;
    private sendMessage;
    private sendSimpleMessage;
    join(room: string): this;
    leave(room: string): this;
    getRooms(): string[];
    joinWithMetadata(room: string, metadata?: any): this;
    getRoomMetadata(room: string): any;
    inRoom(room: string): boolean;
    to(room: string): BroadcastOperator;
    in(room: string): BroadcastOperator;
    except(room: string): BroadcastOperator;
    disconnect(): this;
    ping(data?: Buffer): void;
    getConnectionInfo(): {
        id: string;
        isConnected: boolean;
        readyState: number;
        lastActivity: number;
        connectionDuration: number;
        rooms: string[];
    };
    isAlive(): boolean;
    get nsp(): Namespace;
    set nsp(value: Namespace);
}
export declare class SocketIOLikeServer extends EventEmitter {
    private users;
    private rooms;
    private roomMetadata;
    private emitter;
    private wss?;
    private namespaces;
    private defaultNamespace;
    private middleware;
    private eventMiddleware;
    private useMiddleware;
    useEventMiddleware: boolean;
    logger: import("../logger/Logger").ExtendedLogger;
    constructor();
    enableMaxCompatibility(): this;
    enableFullFeatures(): this;
    listen(port: number, callback?: () => void): void;
    attach(server: any, callback?: () => void): void;
    private setupWebSocketServer;
    enableMiddleware(): this;
    enableEventMiddleware(): this;
    disableMiddleware(): this;
    disableEventMiddleware(): this;
    use(middleware: (socket: SocketIOLikeSocket, next: (err?: Error) => void) => void): this;
    use(middleware: (socket: SocketIOLikeSocket, event: string, data: any[], next: (err?: Error) => void) => void): this;
    private executeServerMiddleware;
    of(namespaceName: string): Namespace;
    private isIdAvailable;
    generateUniqueId(): string;
    hasUser(id: string): boolean;
    registerUser(socket: SocketIOLikeSocket): void;
    unregisterUser(socketId: string): void;
    addToRoom(room: string, socketId: string): void;
    removeFromRoom(room: string, socketId: string): void;
    broadcastToAll(event: string, args: any[], excludeId?: string): void;
    broadcastToRoom(room: string, event: string, args: any[], excludeId?: string): void;
    on(event: string, callback: (data: any) => void): this;
    once(event: string, callback: (data: any) => void): this;
    off(event: string, callback?: (data: any) => void): this;
    to(room: string): BroadcastOperator;
    in(room: string): BroadcastOperator;
    except(room: string): BroadcastOperator;
    private createBroadcastOperator;
    emit(event: string, ...args: any[]): boolean;
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
    };
    getUser(socketId: string): ConnectedUser | undefined;
    getAllUsers(): Map<string, ConnectedUser>;
    getUsersInRoom(room: string): ConnectedUser[];
    getRoomMetadata(room: string): RoomMetadata | undefined;
    setRoomMetadata(room: string, metadata: any): void;
    getAllRooms(): Array<RoomMetadata>;
    hasRoom(room: string): boolean;
    getRoomUserCount(room: string): number;
    close(callback?: () => void): void;
}
export declare const wsio: SocketIOLikeServer;
export type { ConnectedUser, RoomMetadata, BroadcastOperator };
export { Namespace };
//# sourceMappingURL=SocketIOLikeAdapter.d.ts.map