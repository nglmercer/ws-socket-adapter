// ws-adapter.ts
// Adapter que emula la API de Socket.IO usando WebSocket nativo
import { createClientLogger } from './ClientLogger.js';
// Clase que emula Socket de Socket.IO usando WebSocket nativo
export class SocketIOLikeClient {
    constructor(url, options = {}, log = true) {
        this.ws = null;
        this.eventCallbacks = {};
        this.anyCallbacks = [];
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.reconnectDelayMax = 5000;
        this.randomizationFactor = 0.5;
        this.pendingCallbacks = new Map();
        this.callbackCounter = 0;
        this.compressionEnabled = false;
        this.currentTimeout = null;
        this.reconnectTimer = null;
        this.connectionTimeout = null;
        this.cleanupTimer = null;
        this.isReconnecting = false;
        this.manualDisconnect = false;
        this.url = url;
        this.options = {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            randomizationFactor: 0.5,
            timeout: 20000,
            ...options
        };
        this.maxReconnectAttempts = this.options.reconnectionAttempts || 5;
        this.reconnectDelay = this.options.reconnectionDelay || 1000;
        this.reconnectDelayMax = this.options.reconnectionDelayMax || 5000;
        this.randomizationFactor = this.options.randomizationFactor || 0.5;
        this.socketId = `ws-client-${Math.random().toString(36).substring(2, 11)}`;
        // Initialize browser-compatible logger
        this.logger = createClientLogger({
            prefix: `ws-client-${this.socketId}`,
            level: log ? 0 : 1 // DEBUG if debug option is true, otherwise INFO
        });
        this.logger.info('client_created', 'WebSocket client created', {
            url: this.url,
            socketId: this.socketId,
            reconnection: this.options.reconnection,
            timeout: this.options.timeout
        });
        // Iniciar limpieza periódica de callbacks
        this.cleanupTimer = setInterval(() => {
            this.cleanupStaleCallbacks();
        }, 30000); // Cada 30 segundos
        if (options.autoConnect !== false) {
            this.logger.debug('auto_connect', 'Auto-connecting client');
            this.connect();
        }
    }
    connect() {
        // Limpiar timers existentes
        this.clearTimers();
        this.manualDisconnect = false;
        try {
            // Emitir evento de intento de reconexión si no es la primera conexión
            if (this.reconnectAttempts > 0) {
                this.emit('reconnect_attempt', this.reconnectAttempts);
            }
            // Construir URL con query parameters
            let wsUrl = this.url.replace(/^http/, 'ws');
            const queryParams = new URLSearchParams();
            // Agregar query parameters existentes
            if (this.options.query) {
                Object.entries(this.options.query).forEach(([key, value]) => {
                    queryParams.append(key, value);
                });
            }
            // Agregar información de autenticación si existe
            if (this.options.auth) {
                queryParams.append('auth', JSON.stringify(this.options.auth));
            }
            // Agregar socket ID
            queryParams.append('socketId', this.socketId);
            // Agregar parámetros de configuración
            if (this.options.forceNew) {
                queryParams.append('forceNew', 'true');
            }
            if (this.options.multiplex !== undefined) {
                queryParams.append('multiplex', this.options.multiplex.toString());
            }
            const queryString = queryParams.toString();
            if (queryString) {
                wsUrl += (wsUrl.includes('?') ? '&' : '?') + queryString;
            }
            this.ws = new WebSocket(wsUrl);
            this.setupEventListeners();
            // Configurar timeout de conexión
            const timeout = this.options.timeout || 20000;
            this.connectionTimeout = setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                    const error = new Error('Connection timeout');
                    error.code = 'CONNECTION_TIMEOUT';
                    error.type = 'TransportError';
                    error.description = `Connection timeout after ${timeout}ms`;
                    this.ws.close(1000, 'Connection timeout');
                    this.handleConnectionError(error);
                }
            }, timeout);
        }
        catch (error) {
            console.error('Error al conectar WebSocket:', error);
            this.handleConnectionError(error);
        }
        return this;
    }
    setupEventListeners() {
        if (!this.ws)
            return;
        this.ws.onopen = () => {
            this.clearTimers();
            this.isConnected = true;
            // Emitir evento de reconexión exitosa si era un intento de reconexión
            if (this.isReconnecting && this.reconnectAttempts > 0) {
                this.emit('reconnect', this.reconnectAttempts);
            }
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.emit('connect');
        };
        this.ws.onmessage = event => {
            try {
                const data = JSON.parse(event.data);
                console.log('[WS-ADAPTER] Mensaje recibido:', data);
                // Manejar respuestas de callbacks
                if (data.event === 'callback-response' &&
                    data.callbackId &&
                    this.pendingCallbacks.has(data.callbackId)) {
                    console.log('[WS-ADAPTER] Procesando callback response:', data.callbackId, data.payload);
                    const callbackInfo = this.pendingCallbacks.get(data.callbackId);
                    this.pendingCallbacks.delete(data.callbackId);
                    // Limpiar timeout
                    clearTimeout(callbackInfo.timeoutId);
                    try {
                        // Manejar errores del servidor en la respuesta
                        if (data.error) {
                            const serverError = new Error(data.error.message || 'Server callback error');
                            serverError.code = data.error.code || 'SERVER_CALLBACK_ERROR';
                            serverError.type = 'CallbackError';
                            serverError.callbackId = data.callbackId;
                            serverError.originalError = data.error;
                            callbackInfo.callback(serverError);
                        }
                        else {
                            // El servidor envía la respuesta en data.payload
                            callbackInfo.callback(...(data.payload || []));
                        }
                    }
                    catch (error) {
                        console.error('Error ejecutando callback:', error);
                        // Crear error mejorado para callback execution
                        const callbackError = new Error('Callback execution failed');
                        callbackError.code = 'CALLBACK_EXECUTION_ERROR';
                        callbackError.type = 'CallbackError';
                        callbackError.callbackId = data.callbackId;
                        callbackError.originalError = error;
                        callbackError.event = callbackInfo.event;
                        this.emit('error', callbackError);
                    }
                    return;
                }
                // Emitir evento normal
                if (data.event && data.event !== 'callback-response') {
                    console.log('[WS-ADAPTER] Emitiendo evento:', data.event, data.payload);
                    this.emit(data.event, ...(data.payload || []));
                }
            }
            catch (error) {
                console.error('[WS-ADAPTER] Error parsing WebSocket message:', error);
                // Create enhanced parse error
                const parseError = new Error('Failed to parse WebSocket message');
                parseError.code = 'PARSE_ERROR';
                parseError.type = 'MessageError';
                parseError.originalError = error;
                parseError.rawMessage = event.data;
                parseError.timestamp = Date.now();
                this.emit('error', parseError);
            }
        };
        this.ws.onclose = event => {
            this.clearTimers();
            this.isConnected = false;
            // Determine disconnect reason based on close code
            let reason = event.reason || this.getDisconnectReason(event.code);
            const wasClean = event.wasClean;
            console.log(`[WS-ADAPTER] Connection closed: ${reason} (code: ${event.code}, clean: ${wasClean})`);
            // Create disconnect details object
            const disconnectDetails = {
                wasClean,
                code: event.code,
                reason: event.reason,
                timestamp: Date.now(),
                attempt: this.reconnectAttempts
            };
            this.emit('disconnect', reason, disconnectDetails);
            // Solo intentar reconexión si no fue una desconexión manual y el código indica un error
            if (!this.manualDisconnect && this.shouldReconnectOnClose(event.code)) {
                this.scheduleReconnection();
            }
        };
        this.ws.onerror = error => {
            console.error('[WS-ADAPTER] WebSocket error:', error);
            // Create enhanced error object
            const enhancedError = new Error('WebSocket connection error');
            enhancedError.code = 'WEBSOCKET_ERROR';
            enhancedError.type = 'TransportError';
            enhancedError.originalError = error;
            enhancedError.readyState = this.ws?.readyState;
            enhancedError.url = this.url;
            this.handleConnectionError(enhancedError);
        };
    }
    getDisconnectReason(code) {
        switch (code) {
            case 1000:
                return 'Normal closure';
            case 1001:
                return 'Going away';
            case 1002:
                return 'Protocol error';
            case 1003:
                return 'Unsupported data';
            case 1005:
                return 'No status received';
            case 1006:
                return 'Abnormal closure';
            case 1007:
                return 'Invalid frame payload data';
            case 1008:
                return 'Policy violation';
            case 1009:
                return 'Message too big';
            case 1010:
                return 'Mandatory extension';
            case 1011:
                return 'Internal server error';
            case 1015:
                return 'TLS handshake failure';
            default:
                return `Connection closed (code: ${code})`;
        }
    }
    shouldReconnectOnClose(code) {
        // Don't reconnect on normal closure or client-initiated closures
        if (code === 1000 || code === 1001) {
            return false;
        }
        // Don't reconnect on protocol errors or policy violations
        if (code === 1002 || code === 1003 || code === 1007 || code === 1008) {
            return false;
        }
        // Reconnect on abnormal closures, server errors, etc.
        return true;
    }
    on(event, callback) {
        if (!this.eventCallbacks[event]) {
            this.eventCallbacks[event] = [];
        }
        this.eventCallbacks[event].push(callback);
        return this;
    }
    once(event, callback) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            callback(...args);
        };
        return this.on(event, onceWrapper);
    }
    off(event, callback) {
        if (!this.eventCallbacks[event])
            return this;
        if (callback) {
            const index = this.eventCallbacks[event].indexOf(callback);
            if (index > -1) {
                this.eventCallbacks[event].splice(index, 1);
            }
        }
        else {
            delete this.eventCallbacks[event];
        }
        return this;
    }
    onAny(callback) {
        this.anyCallbacks.push(callback);
        return this;
    }
    offAny(callback) {
        if (callback) {
            const index = this.anyCallbacks.indexOf(callback);
            if (index > -1) {
                this.anyCallbacks.splice(index, 1);
            }
        }
        else {
            this.anyCallbacks = [];
        }
        return this;
    }
    send(...args) {
        this.emit('message', ...args);
        return this;
    }
    compress(compress) {
        this.compressionEnabled = compress;
        return this;
    }
    timeout(timeout) {
        this.currentTimeout = timeout;
        return this;
    }
    emit(event, ...args) {
        // Si es un evento local, ejecutar callbacks específicos
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].forEach(callback => {
                try {
                    callback(...args);
                }
                catch (error) {
                    console.error(`Error en callback del evento '${event}':`, error);
                }
            });
        }
        // Ejecutar callbacks "any" para todos los eventos
        if (this.anyCallbacks.length > 0) {
            this.anyCallbacks.forEach(callback => {
                try {
                    callback(event, ...args);
                }
                catch (error) {
                    console.error(`Error en callback "any" del evento '${event}':`, error);
                }
            });
        }
        // Si está conectado y no es un evento interno, enviar al servidor
        if (this.isConnected && this.ws && !this.isInternalEvent(event)) {
            // Verificar que el WebSocket esté en estado OPEN antes de enviar
            if (this.ws.readyState !== WebSocket.OPEN) {
                console.warn(`[WS-ADAPTER] Cannot send message '${event}': WebSocket is not in OPEN state (readyState: ${this.ws.readyState})`);
                // Si el WebSocket está cerrado, actualizar el estado interno
                if (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
                    this.isConnected = false;
                    // Emitir evento de desconexión si no se ha emitido ya
                    if (this.ws.readyState === WebSocket.CLOSED) {
                        this.emit('disconnect', 'transport close', {
                            wasClean: false,
                            code: 1006,
                            reason: 'WebSocket closed unexpectedly',
                            timestamp: Date.now(),
                            attempt: this.reconnectAttempts
                        });
                    }
                }
                return false;
            }
            try {
                const message = {
                    event,
                    payload: args,
                };
                // Agregar información de compresión si está habilitada
                if (this.compressionEnabled) {
                    message.compress = true;
                }
                // Manejar callbacks con timeout
                const lastArg = args[args.length - 1];
                if (typeof lastArg === 'function') {
                    const callbackId = `cb_${++this.callbackCounter}`;
                    const timeout = this.currentTimeout || this.options.timeout || 20000;
                    console.log('[WS-ADAPTER] Enviando mensaje con callback:', event, callbackId, args.slice(0, -1));
                    // Configurar timeout para el callback con manejo mejorado
                    const timeoutId = setTimeout(() => {
                        this.handleCallbackTimeout(callbackId, timeout);
                    }, timeout);
                    // Almacenar información del callback con metadatos adicionales
                    this.pendingCallbacks.set(callbackId, {
                        callback: lastArg,
                        timeoutId,
                        timestamp: Date.now(),
                        event,
                        timeout,
                        retries: 0
                    });
                    message.payload = args.slice(0, -1);
                    message.callbackId = callbackId;
                    // Reset timeout después de usar
                    this.currentTimeout = null;
                }
                else {
                    console.log('[WS-ADAPTER] Enviando mensaje sin callback:', event, args);
                }
                this.ws.send(JSON.stringify(message));
                return true;
            }
            catch (error) {
                console.error('Error al enviar mensaje:', error);
                // Si el error es DOMException, probablemente el WebSocket está cerrado
                if (error instanceof DOMException) {
                    console.warn('[WS-ADAPTER] DOMException caught - WebSocket may be closed, updating connection state');
                    this.isConnected = false;
                    // Emitir evento de error de conexión
                    const connectionError = new Error('WebSocket connection lost during send operation');
                    connectionError.code = 'WEBSOCKET_SEND_ERROR';
                    connectionError.type = 'TransportError';
                    connectionError.originalError = error;
                    connectionError.readyState = this.ws?.readyState;
                    this.emit('error', connectionError);
                }
                return false;
            }
        }
        return true;
    }
    isInternalEvent(event) {
        return ['connect', 'disconnect', 'error', 'connect_error', 'reconnect', 'reconnect_attempt', 'reconnect_error', 'reconnect_failed', 'user-registered', 'userid-already-taken'].includes(event);
    }
    clearTimers() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }
    clearAllTimers() {
        this.clearTimers();
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    handleConnectionError(error) {
        this.isConnected = false;
        this.clearTimers();
        // Enhance error object with additional context
        if (error && typeof error === 'object') {
            error.timestamp = Date.now();
            error.attempt = this.reconnectAttempts;
            error.url = this.url;
            // Add error type if not present
            if (!error.type) {
                error.type = 'TransportError';
            }
            // Add error code if not present
            if (!error.code) {
                error.code = 'CONNECTION_ERROR';
            }
        }
        // Emit appropriate error event based on connection state
        if (this.isReconnecting && this.reconnectAttempts > 0) {
            this.emit('reconnect_error', error);
        }
        else {
            this.emit('connect_error', error);
        }
        // Also emit generic error event for compatibility
        this.emit('error', error);
        this.scheduleReconnection();
    }
    scheduleReconnection() {
        // No reconectar si fue desconexión manual o si la reconexión está deshabilitada
        if (this.manualDisconnect || this.options.reconnection === false) {
            return;
        }
        // No reconectar si se alcanzó el máximo de intentos
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            const failedError = new Error('Reconnection failed after maximum attempts');
            failedError.code = 'RECONNECT_FAILED';
            failedError.type = 'ReconnectionError';
            failedError.attempts = this.reconnectAttempts;
            failedError.maxAttempts = this.maxReconnectAttempts;
            this.emit('reconnect_failed', failedError);
            this.emit('error', failedError);
            return;
        }
        // Calcular delay con backoff exponencial mejorado
        const delay = this.calculateReconnectionDelay();
        this.isReconnecting = true;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`[WS-ADAPTER] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} (delay: ${Math.round(delay)}ms)`);
            this.connect();
        }, delay);
    }
    calculateReconnectionDelay() {
        const baseDelay = this.reconnectDelay;
        const maxDelay = this.reconnectDelayMax;
        const randomizationFactor = this.randomizationFactor;
        // Exponential backoff: delay = baseDelay * (2 ^ attempts)
        let delay = baseDelay * Math.pow(2, this.reconnectAttempts);
        // Apply maximum delay limit
        delay = Math.min(delay, maxDelay);
        // Add randomization to prevent thundering herd
        // randomization = delay * randomizationFactor * random(0, 1)
        const randomization = delay * randomizationFactor * Math.random();
        // Apply randomization (can be positive or negative)
        const shouldAdd = Math.random() < 0.5;
        delay = shouldAdd ? delay + randomization : delay - randomization;
        // Ensure delay is not negative and has a minimum value
        delay = Math.max(delay, baseDelay * 0.1);
        return Math.round(delay);
    }
    handleCallbackTimeout(callbackId, timeout) {
        if (!this.pendingCallbacks.has(callbackId)) {
            return;
        }
        const callbackInfo = this.pendingCallbacks.get(callbackId);
        this.pendingCallbacks.delete(callbackId);
        try {
            const timeoutError = new Error(`Callback timeout after ${timeout}ms`);
            timeoutError.code = 'CALLBACK_TIMEOUT';
            timeoutError.type = 'CallbackError';
            timeoutError.callbackId = callbackId;
            timeoutError.event = callbackInfo.event;
            timeoutError.timeout = timeout;
            timeoutError.timestamp = Date.now();
            timeoutError.elapsedTime = Date.now() - callbackInfo.timestamp;
            callbackInfo.callback(timeoutError);
        }
        catch (error) {
            console.error('[WS-ADAPTER] Error en callback timeout:', error);
            // Crear error mejorado para timeout callback execution
            const timeoutCallbackError = new Error('Timeout callback execution failed');
            timeoutCallbackError.code = 'TIMEOUT_CALLBACK_EXECUTION_ERROR';
            timeoutCallbackError.type = 'CallbackError';
            timeoutCallbackError.callbackId = callbackId;
            timeoutCallbackError.originalError = error;
            timeoutCallbackError.event = callbackInfo.event;
            this.emit('error', timeoutCallbackError);
        }
    }
    cleanupStaleCallbacks() {
        const now = Date.now();
        const maxAge = 60000; // 60 segundos
        const cleanedCallbacks = [];
        this.pendingCallbacks.forEach((callbackInfo, callbackId) => {
            if (now - callbackInfo.timestamp > maxAge) {
                clearTimeout(callbackInfo.timeoutId);
                this.pendingCallbacks.delete(callbackId);
                cleanedCallbacks.push(callbackId);
                try {
                    const staleError = new Error('Callback cleanup - too old');
                    staleError.code = 'CALLBACK_STALE';
                    staleError.type = 'CallbackError';
                    staleError.callbackId = callbackId;
                    staleError.event = callbackInfo.event;
                    staleError.age = now - callbackInfo.timestamp;
                    staleError.maxAge = maxAge;
                    callbackInfo.callback(staleError);
                }
                catch (error) {
                    console.error('[WS-ADAPTER] Error en cleanup de callback stale:', error);
                    // Emitir error para cleanup fallido
                    const cleanupError = new Error('Stale callback cleanup failed');
                    cleanupError.code = 'STALE_CALLBACK_CLEANUP_ERROR';
                    cleanupError.type = 'CallbackError';
                    cleanupError.callbackId = callbackId;
                    cleanupError.originalError = error;
                    this.emit('error', cleanupError);
                }
            }
        });
        // Log cleanup statistics if any callbacks were cleaned
        if (cleanedCallbacks.length > 0) {
            console.log(`[WS-ADAPTER] Cleaned up ${cleanedCallbacks.length} stale callbacks:`, cleanedCallbacks);
        }
    }
    cleanupPendingCallbacks(code, reason) {
        const callbacksToCleanup = Array.from(this.pendingCallbacks.entries());
        const cleanupErrors = [];
        callbacksToCleanup.forEach(([callbackId, callbackInfo]) => {
            clearTimeout(callbackInfo.timeoutId);
            try {
                const disconnectError = new Error(reason);
                disconnectError.code = code;
                disconnectError.type = 'CallbackError';
                disconnectError.callbackId = callbackId;
                disconnectError.event = callbackInfo.event;
                disconnectError.timestamp = Date.now();
                disconnectError.pendingTime = Date.now() - callbackInfo.timestamp;
                callbackInfo.callback(disconnectError);
            }
            catch (error) {
                console.error(`[WS-ADAPTER] Error in callback cleanup (${callbackId}):`, error);
                cleanupErrors.push({
                    callbackId,
                    event: callbackInfo.event,
                    error
                });
            }
        });
        this.pendingCallbacks.clear();
        // Emitir errores de cleanup si los hay
        if (cleanupErrors.length > 0) {
            const cleanupError = new Error(`Failed to cleanup ${cleanupErrors.length} callbacks`);
            cleanupError.code = 'CALLBACK_CLEANUP_ERROR';
            cleanupError.type = 'CallbackError';
            cleanupError.cleanupErrors = cleanupErrors;
            this.emit('error', cleanupError);
        }
        console.log(`[WS-ADAPTER] Cleaned up ${callbacksToCleanup.length} pending callbacks (reason: ${reason})`);
    }
    getCallbackStats() {
        const now = Date.now();
        let oldestAge = 0;
        let totalAge = 0;
        const byEvent = {};
        const timeoutDistribution = {};
        this.pendingCallbacks.forEach((callbackInfo) => {
            const age = now - callbackInfo.timestamp;
            if (age > oldestAge) {
                oldestAge = age;
            }
            totalAge += age;
            // Count by event
            byEvent[callbackInfo.event] = (byEvent[callbackInfo.event] || 0) + 1;
            // Count by timeout range
            const timeoutRange = this.getTimeoutRange(callbackInfo.timeout);
            timeoutDistribution[timeoutRange] = (timeoutDistribution[timeoutRange] || 0) + 1;
        });
        const averageAge = this.pendingCallbacks.size > 0 ? totalAge / this.pendingCallbacks.size : 0;
        return {
            pending: this.pendingCallbacks.size,
            oldestAge,
            averageAge,
            byEvent,
            timeoutDistribution
        };
    }
    getTimeoutRange(timeout) {
        if (timeout < 1000)
            return '<1s';
        if (timeout < 5000)
            return '1-5s';
        if (timeout < 10000)
            return '5-10s';
        if (timeout < 30000)
            return '10-30s';
        return '>30s';
    }
    getReconnectionStats() {
        return {
            isReconnecting: this.isReconnecting,
            attempts: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            nextDelay: this.isReconnecting ? this.calculateReconnectionDelay() : undefined,
            reconnectionEnabled: this.options.reconnection !== false
        };
    }
    disconnect() {
        this.manualDisconnect = true;
        this.clearAllTimers();
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.isConnected = false;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        // Limpiar callbacks pendientes con error mejorado
        this.cleanupPendingCallbacks('SOCKET_DISCONNECTED', 'Socket disconnected');
        return this;
    }
    get connected() {
        return this.isConnected;
    }
    get disconnected() {
        return !this.isConnected;
    }
    get id() {
        return this.socketId;
    }
    // Método público para limpiar callbacks manualmente
    clearCallbacks(eventFilter) {
        let clearedCount = 0;
        const callbacksToRemove = [];
        this.pendingCallbacks.forEach((callbackInfo, callbackId) => {
            if (!eventFilter || callbackInfo.event === eventFilter) {
                clearTimeout(callbackInfo.timeoutId);
                callbacksToRemove.push(callbackId);
                try {
                    const clearError = new Error('Callback manually cleared');
                    clearError.code = 'CALLBACK_CLEARED';
                    clearError.type = 'CallbackError';
                    clearError.callbackId = callbackId;
                    clearError.event = callbackInfo.event;
                    clearError.timestamp = Date.now();
                    callbackInfo.callback(clearError);
                    clearedCount++;
                }
                catch (error) {
                    console.error(`[WS-ADAPTER] Error clearing callback ${callbackId}:`, error);
                }
            }
        });
        callbacksToRemove.forEach(callbackId => {
            this.pendingCallbacks.delete(callbackId);
        });
        console.log(`[WS-ADAPTER] Manually cleared ${clearedCount} callbacks${eventFilter ? ` for event '${eventFilter}'` : ''}`);
        return clearedCount;
    }
    // Método para obtener información detallada de callbacks pendientes
    getPendingCallbacks() {
        const now = Date.now();
        const callbacks = [];
        this.pendingCallbacks.forEach((callbackInfo, callbackId) => {
            callbacks.push({
                callbackId,
                event: callbackInfo.event,
                age: now - callbackInfo.timestamp,
                timeout: callbackInfo.timeout,
                retries: callbackInfo.retries
            });
        });
        return callbacks.sort((a, b) => b.age - a.age); // Sort by age, oldest first
    }
    // Método para configurar límites de callbacks
    setCallbackLimits(maxPending = 1000, maxAge = 300000) {
        // Limpiar callbacks que excedan el límite de edad
        const now = Date.now();
        const callbacksToRemove = [];
        this.pendingCallbacks.forEach((callbackInfo, callbackId) => {
            if (now - callbackInfo.timestamp > maxAge) {
                callbacksToRemove.push(callbackId);
            }
        });
        // Limpiar callbacks más antiguos si excedemos el límite
        if (this.pendingCallbacks.size > maxPending) {
            const sortedCallbacks = Array.from(this.pendingCallbacks.entries())
                .sort(([, a], [, b]) => a.timestamp - b.timestamp);
            const excessCount = this.pendingCallbacks.size - maxPending;
            for (let i = 0; i < excessCount; i++) {
                callbacksToRemove.push(sortedCallbacks[i][0]);
            }
        }
        // Remover callbacks identificados
        callbacksToRemove.forEach(callbackId => {
            const callbackInfo = this.pendingCallbacks.get(callbackId);
            if (callbackInfo) {
                clearTimeout(callbackInfo.timeoutId);
                this.pendingCallbacks.delete(callbackId);
                try {
                    const limitError = new Error('Callback removed due to limits');
                    limitError.code = 'CALLBACK_LIMIT_EXCEEDED';
                    limitError.type = 'CallbackError';
                    limitError.callbackId = callbackId;
                    limitError.event = callbackInfo.event;
                    callbackInfo.callback(limitError);
                }
                catch (error) {
                    console.error(`[WS-ADAPTER] Error in limit cleanup for callback ${callbackId}:`, error);
                }
            }
        });
        if (callbacksToRemove.length > 0) {
            console.log(`[WS-ADAPTER] Removed ${callbacksToRemove.length} callbacks due to limits (maxPending: ${maxPending}, maxAge: ${maxAge}ms)`);
        }
    }
}
// Función factory que emula io() de Socket.IO
export function io(url, options) {
    return new SocketIOLikeClient(url, options);
}
//# sourceMappingURL=ws-adapter.js.map