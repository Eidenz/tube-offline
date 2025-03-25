import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeDatabase } from './config/database.js';
import { initializeWebSocketServer } from './websocket.js';
import { checkYtDlpInstalled } from './config/yt-dlp.js';
import config from './config.js';

// Import routes
import videoRoutes from './routes/videoRoutes.js';
import { router as downloadRoutes } from './routes/downloadRoutes.js';
import playlistRoutes from './routes/playlistRoutes.js';
import searchRoutes from './routes/searchRoutes.js';

// Get current directory (ES Module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const PORT = config.port;

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  hsts: false, // Disable HTTP Strict Transport Security
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files for video streaming
app.use('/videos', express.static(config.videosDir));
app.use('/thumbnails', express.static(config.thumbnailsDir));
app.use('/subtitles', express.static(config.subtitlesDir));

// Serve the built frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
}

// API routes
app.use('/api/videos', videoRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/search', searchRoutes);

// Serve index.html for all routes in production (for SPA support)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/videos') || 
        req.path.startsWith('/thumbnails') || 
        req.path.startsWith('/subtitles')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

// Initialize WebSocket server
const wss = initializeWebSocketServer(server);

// Check if yt-dlp is installed
checkYtDlpInstalled().then(installed => {
  if (!installed) {
    console.warn('WARNING: yt-dlp is not installed or not found in PATH. Download functionality will not work.');
    console.warn('Please install yt-dlp: https://github.com/yt-dlp/yt-dlp/wiki/Installation');
  } else {
    console.log('yt-dlp is installed and ready to use');
  }
});

// Initialize database
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on HTTP at http://localhost:${PORT}`);
      console.log(`Server running on HTTP at http://${getLocalIP()}:${PORT}`);
      console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
      console.log(`Video data directory: ${config.videosDir}`);
      console.log(`Database path: ${config.dbPath}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

  function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (loopback) addresses
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    
    return 'localhost'; // Fallback
  }