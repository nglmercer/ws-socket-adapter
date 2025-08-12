// Cliente simple para demostrar la API WebSocket
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('✅ Conectado al servidor');
  
  // Enviar mensaje inicial
  ws.send(JSON.stringify({
    type: 'message',
    data: 'Hola desde el cliente!'
  }));
  
  // Enviar mensajes cada 3 segundos
  setInterval(() => {
    const message = {
      type: 'message',
      data: `Mensaje automático - ${new Date().toLocaleTimeString()}`
    };
    ws.send(JSON.stringify(message));
    console.log('📤 Enviado:', message.data);
  }, 3000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Recibido:', message);
  } catch (error) {
    console.log('📥 Recibido (texto):', data.toString());
  }
});

ws.on('close', () => {
  console.log('❌ Conexión cerrada');
});

ws.on('error', (error) => {
  console.error('💥 Error:', error.message);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando cliente...');
  ws.close();
  process.exit(0);
});

console.log('🚀 Cliente iniciado - Conectando a ws://localhost:3000');