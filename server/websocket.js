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
  
  // First, check for any pending playlist additions for this video
  try {
    const pendingAdditions = JSON.parse(localStorage.getItem('pendingPlaylistAdditions') || '[]');
    
    // Find any matching entries for this YouTube ID
    const matchingAdditions = pendingAdditions.filter(entry => entry.youtubeId === youtubeId);
    
    if (matchingAdditions.length > 0) {
      console.log(`Found ${matchingAdditions.length} pending playlist additions for ${youtubeId}`);
      
      // Process each addition
      matchingAdditions.forEach(async (addition) => {
        try {
          // Find the video ID from the database using YouTube ID
          const db = require('./config/database.js').db;
          const stmt = db.prepare('SELECT id FROM videos WHERE youtube_id = ?');
          const video = stmt.get(youtubeId);
          
          if (video && video.id) {
            // Add to the playlist
            const addStmt = db.prepare(`
              INSERT OR IGNORE INTO playlist_videos (playlist_id, video_id, position)
              VALUES (?, ?, (
                SELECT COALESCE(MAX(position), 0) + 1
                FROM playlist_videos
                WHERE playlist_id = ?
              ))
            `);
            
            addStmt.run(addition.playlistId, video.id, addition.playlistId);
            console.log(`Added video ${youtubeId} to playlist ${addition.playlistId}`);
          }
        } catch (err) {
          console.error(`Error adding downloaded video to playlist: ${err.message}`);
        }
      });
      
      // Remove the processed entries
      const remainingAdditions = pendingAdditions.filter(entry => entry.youtubeId !== youtubeId);
      localStorage.setItem('pendingPlaylistAdditions', JSON.stringify(remainingAdditions));
    }
  } catch (err) {
    console.error('Error processing pending playlist additions:', err);
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