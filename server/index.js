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

// Import routes
import videoRoutes from './routes/videoRoutes.js';
import { router as downloadRoutes } from './routes/downloadRoutes.js';
import playlistRoutes from './routes/playlistRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js'; // Import the new favorites routes

// Get current directory (ES Module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files for video streaming
app.use('/videos', express.static(path.join(__dirname, 'data', 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'data', 'thumbnails')));
app.use('/subtitles', express.static(path.join(__dirname, 'data', 'subtitles')));

// API routes
app.use('/api/videos', videoRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/favorites', favoriteRoutes); // Add the new favorites routes

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
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });