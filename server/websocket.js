import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { addClient, removeClient } from './routes/downloadRoutes.js';

// WebSocket connections
let wss = null;

/**
 * Initialize WebSocket server
 * @param {Object} server HTTP server instance
 */
function initializeWebSocketServer(server) {
  // Create WebSocket server
  wss = new WebSocketServer({ server });
  
  console.log('WebSocket server initialized');
  
  // Handle new connections
  wss.on('connection', (ws) => {
    const clientId = uuidv4();
    console.log(`New WebSocket client connected: ${clientId}`);
    
    // Register the client for download updates
    addClient(clientId, ws);
    
    // Handle client messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`Received message from client ${clientId}:`, data);
        
        // Handle different message types here if needed
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      removeClient(clientId);
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      clientId
    }));
  });
  
  return wss;
}

/**
 * Broadcast download completion event to all connected clients
 * @param {string} youtubeId YouTube video ID
 * @param {Object} videoData Video information
 */
function broadcastDownloadComplete(youtubeId, videoData) {
  if (!wss) {
    console.error('WebSocket server not initialized');
    return;
  }
  
  const message = JSON.stringify({
    type: 'download_completed',
    youtubeId,
    videoData
  });
  
  console.log('Broadcasting download completion:', youtubeId);
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
  
  // Add this code to trigger the library refresh event:
  // This ensures that even without websockets, the library will refresh
  try {
    // Trigger a custom event that the LibraryContext can listen for
    const event = new Event('tube-offline-download-completed');
    global.document = global.document || { dispatchEvent: () => {} };
    global.document.dispatchEvent(event);
    
    // Also set a flag in the global space that can be checked
    global.downloadCompletedAt = Date.now();
    global.lastCompletedVideoId = youtubeId;
  } catch (err) {
    console.error('Error dispatching download completion event:', err);
  }
}

export {
  initializeWebSocketServer,
  broadcastDownloadComplete
};