import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import config from '../config.js';

// Get current directory (ES Module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the database directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
const db = new BetterSqlite3(config.dbPath);

// Schema creation - tables for videos, playlists, tags, downloads
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    try {
      // Enable foreign keys
      db.pragma('foreign_keys = ON');
      
      // Create videos table
      db.exec(`
        CREATE TABLE IF NOT EXISTS videos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          youtube_id TEXT UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          channel TEXT,
          thumbnail_path TEXT,
          video_path TEXT NOT NULL,
          subtitle_path TEXT,
          duration INTEGER,
          view_count INTEGER DEFAULT 0,
          last_viewed TIMESTAMP,
          date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT
        )
      `);
      
      // Create playlists table
      db.exec(`
        CREATE TABLE IF NOT EXISTS playlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create playlist_videos table (junction table)
      db.exec(`
        CREATE TABLE IF NOT EXISTS playlist_videos (
          playlist_id INTEGER,
          video_id INTEGER,
          position INTEGER,
          date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (playlist_id, video_id),
          FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        )
      `);
      
      // Create tags table
      db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL
        )
      `);
      
      // Create video_tags table (junction table)
      db.exec(`
        CREATE TABLE IF NOT EXISTS video_tags (
          video_id INTEGER,
          tag_id INTEGER,
          PRIMARY KEY (video_id, tag_id),
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `);
      
      // Create downloads table to track download progress
      db.exec(`
        CREATE TABLE IF NOT EXISTS downloads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          youtube_id TEXT UNIQUE NOT NULL,
          url TEXT NOT NULL,
          title TEXT,
          status TEXT DEFAULT 'pending', -- pending, downloading, completed, failed
          progress REAL DEFAULT 0,
          quality TEXT,
          download_subtitles BOOLEAN DEFAULT 1,
          date_started TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          date_completed TIMESTAMP,
          error_message TEXT
        )
      `);
      
      // Create history table
      db.exec(`
        CREATE TABLE IF NOT EXISTS history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          video_id INTEGER,
          watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          watch_duration INTEGER DEFAULT 0,
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        )
      `);

      // Create favorites table
      db.exec(`
        CREATE TABLE IF NOT EXISTS favorites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          video_id INTEGER UNIQUE NOT NULL,
          date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        )
      `);
      
      // Add indexes for better performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);
        CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
        CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
        CREATE INDEX IF NOT EXISTS idx_history_video_id ON history(video_id);
        CREATE INDEX IF NOT EXISTS idx_history_watched_at ON history(watched_at);
        CREATE INDEX IF NOT EXISTS idx_favorites_video_id ON favorites(video_id);
        CREATE INDEX IF NOT EXISTS idx_favorites_date_added ON favorites(date_added);
      `);

      // Add playlist-related fields to downloads table if they don't exist
      try {
        // Check if the columns exist
        const checkColumns = db.prepare(`PRAGMA table_info(downloads)`).all();
        const columns = checkColumns.map(col => col.name);
        
        // Add is_playlist column if it doesn't exist
        if (!columns.includes('is_playlist')) {
          db.exec(`ALTER TABLE downloads ADD COLUMN is_playlist BOOLEAN DEFAULT 0`);
          console.log('Added is_playlist column to downloads table');
        }
        
        // Add playlist_size column if it doesn't exist
        if (!columns.includes('playlist_size')) {
          db.exec(`ALTER TABLE downloads ADD COLUMN playlist_size INTEGER DEFAULT 0`);
          console.log('Added playlist_size column to downloads table');
        }
        
        // Add playlist_complete column if it doesn't exist
        if (!columns.includes('playlist_complete')) {
          db.exec(`ALTER TABLE downloads ADD COLUMN playlist_complete INTEGER DEFAULT 0`);
          console.log('Added playlist_complete column to downloads table');
        }

        // Check if the playlist_target_id column exists
        const checkColumn = db.prepare(`PRAGMA table_info(downloads)`).all();
        const hasPlaylistTargetColumn = checkColumn.some(col => col.name === 'playlist_target_id');
        
        if (!hasPlaylistTargetColumn) {
          console.log('Adding playlist_target_id column to downloads table');
          db.exec(`ALTER TABLE downloads ADD COLUMN playlist_target_id INTEGER DEFAULT NULL`);
        }
      } catch (error) {
        console.error('Error updating downloads table schema:', error);
        // Continue initialization even if this fails
      }
      
      console.log('Database schema initialized successfully');
      resolve();
    } catch (error) {
      console.error('Database initialization error:', error);
      reject(error);
    }
  });
}

export {
  db,
  initializeDatabase
};