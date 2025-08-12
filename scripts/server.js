// Servidor de demostración para la API WebSocket
import { SocketIOLikeServer, SocketIOLikeSocket, defaultLogger } from '../dist/index.js';

const server = new SocketIOLikeServer();
let connectedClients = 0;

// Configurar logger para mostrar más detalles
defaultLogger.updateConfig({
  level: 5, // DEBUG level
  enableConsole: true,
  enableFile: true,
  logDirectory: './logs'
});
defaultLogger.silence();
console.log('🚀 Iniciando servidor de demostración...');

server.on('connection', (socket) => {
  connectedClients++;
  console.log(`✅ Cliente conectado: ${socket.id} (Total: ${connectedClients})`);
  defaultLogger.info('connected', { message: `Client connected: ${socket.id}`, data: { socketId: socket.id, totalClients: connectedClients } });

  // Enviar mensaje de bienvenida
  socket.emit('welcome', {
    message: '¡Bienvenido al servidor!',
    clientId: socket.id,
    timestamp: new Date().toISOString()
  });

  // Manejar mensajes del cliente
  socket.on('message', (data) => {
    console.log(`📥 Mensaje de ${socket.id}:`, data);
    defaultLogger.info('message_received', { 
      message: 'Message received from client', 
      data, 
      socketId: socket.id 
    });
    
    // Responder al cliente
    socket.emit('response', {
      message: 'Mensaje recibido correctamente',
      echo: data,
      serverTime: new Date().toLocaleTimeString(),
      clientId: socket.id
    });
    
    // Broadcast a otros clientes (si hay más de uno)
    if (connectedClients > 1) {
      socket.broadcast.emit('broadcast', {
        from: socket.id,
        message: data,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Manejar eventos personalizados
  socket.on('ping', () => {
    console.log(`🏓 Ping de ${socket.id}`);
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`❌ Cliente desconectado: ${socket.id} (Total: ${connectedClients})`);
    defaultLogger.info('disconnected', { message: `Client disconnected: ${socket.id}`, data: { socketId: socket.id, totalClients: connectedClients } });
  });

  socket.on('error', (error) => {
    console.error(`💥 Error en ${socket.id}:`, error);
    defaultLogger.error('socket_error', { error: error.message, socketId: socket.id });
  });
});

// Enviar estadísticas cada 30 segundos
setInterval(() => {
  if (connectedClients > 0) {
    server.emit('stats', {
      connectedClients,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
    console.log(`📊 Estadísticas: ${connectedClients} clientes conectados`);
  }
}, 30000);

server.listen(3000, () => {
  console.log('🌐 Servidor ejecutándose en puerto 3001');
  console.log('📝 Logs guardándose en ./logs/');
  console.log('🔗 Conecta un cliente con: node scripts/client.js');
  defaultLogger.info('server_started', { 
    message: 'Server started successfully', 
    data: { port: 3001, logsEnabled: true }
  });
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  defaultLogger.info('server_shutdown', { message: 'Server shutting down gracefully' });
  process.exit(0);
});
