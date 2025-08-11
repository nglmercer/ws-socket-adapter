import { EventEmitter } from 'events';
import { SocketIOLikeSocket } from './SocketIOLikeAdapter.js';
interface BroadcastOperator {
    emit(event: string, ...args: any[]): boolean;
    to(room: string | string[]): BroadcastOperator;
    in(room: string | string[]): BroadcastOperator;
    except(room: string | string[]): BroadcastOperator;
    compress(compress: boolean): BroadcastOperator;
    timeout(timeout: number): BroadcastOperator;
    volatile: BroadcastOperator;
    local: BroadcastOperator;
    allSockets(): Promise<Set<string>>;
    socketsJoin(room: string | string[]): void;
    socketsLeave(room: string | string[]): void;
    disconnectSockets(close?: boolean): void;
    fetchSockets(): Promise<any[]>;
}
export declare class Namespace extends EventEmitter {
    readonly name: string;
    sockets: Map<string, SocketIOLikeSocket>;
    private rooms;
    private emitter;
    private middleware;
    private logger;
    private eventMiddleware;
    constructor(name: string);
    use(middleware: (socket: SocketIOLikeSocket, next: (err?: Error) => void) => void): this;
    use(middleware: (socket: SocketIOLikeSocket, event: string, data: any[], next: (err?: Error) => void) => void): this;
    private executeMiddleware;
    addSocket(socket: SocketIOLikeSocket): Promise<void>;
    removeSocket(socketId: string): void;
    addToRoom(room: string, socketId: string): void;
    removeFromRoom(room: string, socketId: string): void;
    getSocketsInRoom(room: string): SocketIOLikeSocket[];
    emit(event: string, ...args: any[]): boolean;
    to(room: string): BroadcastOperator;
    in(room: string): BroadcastOperator;
    except(room: string): BroadcastOperator;
    private createBroadcastOperator;
    on(event: string, callback: (...args: any[]) => void): this;
    once(event: string, callback: (...args: any[]) => void): this;
    off(event: string, callback?: (...args: any[]) => void): this;
    getStats(): {
        name: string;
        socketCount: number;
        roomCount: number;
        rooms: Record<string, number>;
        middlewareCount: number;
        eventMiddlewareCount: number;
    };
}
export {};
//# sourceMappingURL=Namespace.d.ts.map