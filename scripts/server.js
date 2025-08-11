import { SocketIOLikeServer, SocketIOLikeSocket, defaultLogger } from '../dist/index.js';

const server = new SocketIOLikeServer();

defaultLogger.updateConfig({
  level: 'debug',
});
server.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  defaultLogger.connection('connected', socket.id);

  socket.on('message', (data) => {
    console.log('Received:', data);
    defaultLogger.info('message_received', { message: 'Message received from client', data, socketId: socket.id });
    socket.emit('response', 'Hello Client!'); 
  });

  socket.on('disconnect', () => {
    defaultLogger.connection('disconnected', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
  defaultLogger.info('server_started', { message: 'Server started successfully', port: 3000 });
});
