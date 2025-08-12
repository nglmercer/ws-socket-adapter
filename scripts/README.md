# Demostración de la API WebSocket

Esta demostración muestra las capacidades principales de la API WebSocket con logging avanzado.

## Archivos de la demostración

- `server.js` - Servidor WebSocket con logging completo
- `client.js` - Cliente simple para pruebas
- `publish-npm.js` - Script para publicar en npm

## Características demostradas

### Servidor (`server.js`)
- ✅ Conexiones múltiples de clientes
- 📝 Logging avanzado con `defaultLogger.updateConfig()`
- 📊 Estadísticas en tiempo real
- 🔄 Broadcast entre clientes
- 🏓 Eventos personalizados (ping/pong)
- 💾 Guardado de logs en archivos
- 🛡️ Manejo de errores

### Cliente (`client.js`)
- 🔗 Conexión automática al servidor
- 📤 Envío de mensajes automáticos
- 📥 Recepción y manejo de respuestas
- 🔄 Reconexión automática
- 🛑 Cierre graceful

## Cómo ejecutar la demostración

### 1. Compilar el proyecto
```bash
npm run build
```

### 2. Iniciar el servidor
```bash
node scripts/server.js
```

### 3. Conectar clientes (en terminales separadas)
```bash
node scripts/client.js
```

## Funcionalidades del Logger

### Configuración dinámica
```javascript
// Actualizar configuración en tiempo de ejecución
defaultLogger.updateConfig({
  level: 'debug',
  enableConsole: true,
  enableFile: true,
  logDirectory: './logs'
});
```

### Tipos de logging disponibles
```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
  SILENT = 5
}
```

## Salida esperada

### Servidor
```
🚀 Iniciando servidor de demostración...
🌐 Servidor ejecutándose en puerto 3000
📝 Logs guardándose en ./logs/
🔗 Conecta un cliente con: node scripts/client.js
✅ Cliente conectado: abc123 (Total: 1)
📥 Mensaje de abc123: { type: 'message', data: 'Hola desde el cliente!' }
```

### Cliente
```
🚀 Cliente iniciado - Conectando a ws://localhost:3000
✅ Conectado al servidor
📤 Enviado: Mensaje automático - 14:30:15
📥 Recibido: { message: 'Mensaje recibido correctamente', echo: {...} }
```

## Archivos de log

Los logs se guardan automáticamente en `./logs/` con rotación automática.

## Detener la demostración

Presiona `Ctrl+C` para cerrar gracefully el servidor o cliente.

## publish-npm.js

Script automatizado para publicar el paquete en NPM manteniendo el directorio `dist/` fuera del repositorio principal.

### Uso

```bash
# Publicación normal
npm run publish:npm

# Modo de prueba (no publica realmente)
npm run publish:dry-run

# Verificar contenido del paquete antes de publicar
npm run pack:check

# Ejecutar directamente
node scripts/publish-npm.js

# Ver ayuda
node scripts/publish-npm.js --help
```

### ¿Qué hace el script?

1. **Verifica el estado del repositorio**: Se asegura de que no hay cambios sin commitear
2. **Compila el proyecto**: Ejecuta `npm run build`
3. **Crea una rama temporal**: Para manejar los archivos de distribución
4. **Modifica .gitignore**: Temporalmente permite que `dist/` sea trackeado
5. **Agrega archivos de distribución**: Commitea los archivos compilados
6. **Publica en NPM**: Ejecuta `npm publish`
7. **Limpia**: Vuelve a la rama original y elimina la rama temporal

### Requisitos

- Node.js instalado
- Git configurado
- Cuenta de NPM configurada (`npm login`)
- Proyecto compilado correctamente

### Solución de Problemas

#### Error: "Hay cambios sin commitear"
```bash
# Commitea tus cambios primero
git add .
git commit -m "Tu mensaje de commit"
```

#### Error: "El directorio dist/ no existe"
```bash
# Asegúrate de que el build funciona
npm run build
```

#### Error durante la limpieza
```bash
# Limpieza manual si es necesario
git checkout main
git branch -D temp-dist-[timestamp]
```

### Configuración Adicional

Para configurar la autenticación de NPM:

```bash
# Iniciar sesión en NPM
npm login

# Verificar usuario actual
npm whoami

# Configurar registro (si es necesario)
npm config set registry https://registry.npmjs.org/
```

### Integración con CI/CD

Este script también puede usarse en pipelines de CI/CD. Ver el archivo `.github/workflows/publish-npm.yml` para un ejemplo con GitHub Actions.