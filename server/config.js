import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get current directory (ES Module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Server Configuration
const config = {
  // Server port (from environment variable or default 5000)
  port: process.env.PORT || 5000,
  
  // Database path (from environment variable or default to data directory)
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'tube-offline.db'),
  
  // Video storage paths
  videosDir: process.env.VIDEOS_DIR || path.join(__dirname, '..', 'data', 'videos'),
  thumbnailsDir: process.env.THUMBNAILS_DIR || path.join(__dirname, '..', 'data', 'thumbnails'),
  subtitlesDir: process.env.SUBTITLES_DIR || path.join(__dirname, '..', 'data', 'subtitles'),
  
  // Download configuration
  defaultVideoQuality: process.env.DEFAULT_VIDEO_QUALITY || '720',
  downloadSubtitles: process.env.DOWNLOAD_SUBTITLES !== 'false', // true by default
  maxConcurrentDownloads: parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '3', 10),
};

// Ensure all directories exist
for (const dir of [
  path.dirname(config.dbPath),
  config.videosDir, 
  config.thumbnailsDir, 
  config.subtitlesDir
]) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

export default config;