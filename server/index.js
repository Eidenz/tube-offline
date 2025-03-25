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
import { ensureYtDlpReady } from './config/yt-dlp.js';
import config from './config.js';

// Import routes
import videoRoutes from './routes/videoRoutes.js';
import { router as downloadRoutes } from './routes/downloadRoutes.js';
import playlistRoutes from './routes/playlistRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';

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
app.use('/api/favorites', favoriteRoutes);

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

// Check and update yt-dlp if needed
ensureYtDlpReady()
  .then(ready => {
    if (ready) {
      console.log('yt-dlp is ready for use');
    } else {
      console.warn('WARNING: yt-dlp is not properly set up. Download functionality may be limited.');
      console.warn('Please install yt-dlp manually: https://github.com/yt-dlp/yt-dlp/wiki/Installation');
    }
  })
  .catch(err => {
    console.error('Error checking yt-dlp:', err);
    console.warn('WARNING: Will attempt to continue with existing yt-dlp if available');
  });

// Initialize database
initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
      console.log(`Video data directory: ${config.videosDir}`);
      console.log(`Database path: ${config.dbPath}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });