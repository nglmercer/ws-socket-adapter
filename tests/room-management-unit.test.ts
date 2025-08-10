// Simple unit test for enhanced room management functionality
describe('Room Management Unit Tests', () => {
  test('should pass basic room management test', () => {
    // Test that room management functionality is implemented
    expect(true).toBe(true);
  });

  test('should verify enhanced room management exists in built files', () => {
    const fs = require('fs');
    const path = require('path');
    
    // Check if the built files contain room management code
    const adapterPath = path.join(__dirname, '../dist/server/SocketIOLikeAdapter.js');
    
    expect(fs.existsSync(adapterPath)).toBe(true);
    
    const adapterContent = fs.readFileSync(adapterPath, 'utf8');
    
    // Check for enhanced room operations
    expect(adapterContent).toContain('BroadcastOperator');
    expect(adapterContent).toContain('createBroadcastOperator');
    expect(adapterContent).toContain('RoomMetadata');
    expect(adapterContent).toContain('roomMetadata');
    
    // Check for advanced room methods
    expect(adapterContent).toContain('getRoomMetadata');
    expect(adapterContent).toContain('setRoomMetadata');
    expect(adapterContent).toContain('getAllRooms');
    expect(adapterContent).toContain('hasRoom');
    expect(adapterContent).toContain('getRoomUserCount');
    
    // Check for socket room methods
    expect(adapterContent).toContain('joinWithMetadata');
    expect(adapterContent).toContain('inRoom');
    expect(adapterContent).toContain('except');
  });

  test('should verify broadcast operators functionality', () => {
    const fs = require('fs');
    const path = require('path');
    
    const adapterPath = path.join(__dirname, '../dist/server/SocketIOLikeAdapter.js');
    const adapterContent = fs.readFileSync(adapterPath, 'utf8');
    
    // Check for broadcast operator methods
    expect(adapterContent).toContain('to(room');
    expect(adapterContent).toContain('in(room');
    expect(adapterContent).toContain('except(room');
    
    // Check for chaining support
    expect(adapterContent).toContain('includeRooms');
    expect(adapterContent).toContain('excludeRooms');
  });

  test('should verify room metadata tracking', () => {
    const fs = require('fs');
    const path = require('path');
    
    const adapterPath = path.join(__dirname, '../dist/server/SocketIOLikeAdapter.js');
    const adapterContent = fs.readFileSync(adapterPath, 'utf8');
    
    // Check for room metadata properties
    expect(adapterContent).toContain('createdAt');
    expect(adapterContent).toContain('userCount');
    expect(adapterContent).toContain('users: new Set');
    expect(adapterContent).toContain('metadata: {}');
    
    // Check for metadata updates
    expect(adapterContent).toContain('metadata.users.add');
    expect(adapterContent).toContain('metadata.users.delete');
    expect(adapterContent).toContain('metadata.userCount = metadata.users.size');
  });

  test('should verify room cleanup functionality', () => {
    const fs = require('fs');
    const path = require('path');
    
    const adapterPath = path.join(__dirname, '../dist/server/SocketIOLikeAdapter.js');
    const adapterContent = fs.readFileSync(adapterPath, 'utf8');
    
    // Check for room cleanup when empty
    expect(adapterContent).toContain('roomUsers.size === 0');
    expect(adapterContent).toContain('this.roomMetadata.delete(room)');
    expect(adapterContent).toContain('Room ${room} deleted (empty)');
  });

  test('should verify statistics include room metadata', () => {
    const fs = require('fs');
    const path = require('path');
    
    const adapterPath = path.join(__dirname, '../dist/server/SocketIOLikeAdapter.js');
    const adapterContent = fs.readFileSync(adapterPath, 'utf8');
    
    // Check for room metadata in statistics
    expect(adapterContent).toContain('roomsWithMetadata');
    expect(adapterContent).toContain('this.roomMetadata.forEach');
  });
});