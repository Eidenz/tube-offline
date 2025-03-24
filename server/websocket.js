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
}

export {
  initializeWebSocketServer,
  broadcastDownloadComplete
};