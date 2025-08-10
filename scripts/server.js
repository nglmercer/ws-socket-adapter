import { SocketIOLikeServer, SocketIOLikeSocket } from '../dist/server.js';

const server = new SocketIOLikeServer();

server.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('message', (data) => {
    console.log('Received:', data);
    socket.emit('response', 'Hello Client!');
  });
});

server.listen(3000,()=>{
  console.log('Server is running on port 3000');
})
