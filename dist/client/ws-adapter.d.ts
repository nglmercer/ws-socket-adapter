interface EventCallback {
    (...args: any[]): void;
}
interface SocketIOLikeOptions {
    query?: {
        [key: string]: string;
    };
    transports?: string[];
    autoConnect?: boolean;
    auth?: Record<string, any>;
    forceNew?: boolean;
    multiplex?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    randomizationFactor?: number;
    timeout?: number;
    upgrade?: boolean;
    rememberUpgrade?: boolean;
    protocols?: string | string[];
    headers?: Record<string, string>;
    compression?: boolean;
    maxPayload?: number;
    pingInterval?: number;
    pongTimeout?: number;
}
export declare class SocketIOLikeClient {
    private ws;
    private url;
    private options;
    private eventCallbacks;
    private anyCallbacks;
    private isConnected;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private reconnectDelayMax;
    private randomizationFactor;
    private pendingCallbacks;
    private callbackCounter;
    private socketId;
    private compressionEnabled;
    private currentTimeout;
    private reconnectTimer;
    private connectionTimeout;
    private cleanupTimer;
    private isReconnecting;
    private manualDisconnect;
    private logger;
    constructor(url: string, options?: SocketIOLikeOptions, log?: boolean);
    connect(): this;
    private setupEventListeners;
    private getDisconnectReason;
    private shouldReconnectOnClose;
    on(event: string, callback: EventCallback): this;
    once(event: string, callback: EventCallback): this;
    off(event: string, callback?: EventCallback): this;
    onAny(callback: EventCallback): this;
    offAny(callback?: EventCallback): this;
    send(...args: any[]): this;
    compress(compress: boolean): this;
    timeout(timeout: number): this;
    emit(event: string, ...args: any[]): boolean;
    private isInternalEvent;
    private clearTimers;
    private clearAllTimers;
    private handleConnectionError;
    private scheduleReconnection;
    private calculateReconnectionDelay;
    private handleCallbackTimeout;
    private cleanupStaleCallbacks;
    private cleanupPendingCallbacks;
    getCallbackStats(): {
        pending: number;
        oldestAge: number;
        averageAge: number;
        byEvent: Record<string, number>;
        timeoutDistribution: Record<string, number>;
    };
    private getTimeoutRange;
    getReconnectionStats(): {
        isReconnecting: boolean;
        attempts: number;
        maxAttempts: number;
        nextDelay?: number;
        reconnectionEnabled: boolean;
    };
    disconnect(): this;
    get connected(): boolean;
    get disconnected(): boolean;
    get id(): string;
    clearCallbacks(eventFilter?: string): number;
    getPendingCallbacks(): Array<{
        callbackId: string;
        event: string;
        age: number;
        timeout: number;
        retries: number;
    }>;
    setCallbackLimits(maxPending?: number, maxAge?: number): void;
}
export declare function io(url: string, options?: SocketIOLikeOptions): SocketIOLikeClient;
export type Socket = SocketIOLikeClient;
export {};
//# sourceMappingURL=ws-adapter.d.ts.map