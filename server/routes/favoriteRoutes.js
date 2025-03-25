import express from 'express';
import { db } from '../config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory (ES Module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * Get all favorite video IDs in a single call
 * GET /api/favorites/ids
 */
router.get('/ids', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT video_id 
      FROM favorites
    `);
    
    const favorites = stmt.all();
    const favoriteIds = favorites.map(item => item.video_id);
    
    res.json({ favoriteIds });
  } catch (error) {
    console.error('Failed to fetch favorite IDs:', error);
    res.status(500).json({ error: 'Failed to fetch favorite IDs' });
  }
});

/**
 * Get favorite status for a video
 * GET /api/favorites/status/:id
 */
router.get('/status/:id', (req, res) => {
  try {
    const videoId = req.params.id;
    
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM favorites 
      WHERE video_id = ?
    `);
    
    const { count } = stmt.get(videoId);
    
    res.json({ isFavorite: count > 0 });
  } catch (error) {
    console.error('Failed to check favorite status:', error);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
});

/**
 * Get all favorite videos
 * GET /api/favorites
 */
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const stmt = db.prepare(`
      SELECT 
        v.id, v.youtube_id, v.title, v.channel, v.thumbnail_path, 
        v.duration, v.view_count, f.date_added,
        (SELECT MAX(watched_at) FROM history WHERE video_id = v.id) as last_viewed
      FROM videos v
      JOIN favorites f ON v.id = f.video_id
      ORDER BY f.date_added DESC
      LIMIT ? OFFSET ?
    `);
    
    const videos = stmt.all(limit, offset);
    
    // Get total count for pagination
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM favorites');
    const { total } = countStmt.get();
    
    // Format response
    const formattedVideos = videos.map(video => ({
      ...video,
      thumbnail_url: `/thumbnails/${path.basename(video.thumbnail_path)}`,
      duration_formatted: formatDuration(video.duration)
    }));
    
    res.json({
      videos: formattedVideos,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Failed to fetch favorite videos:', error);
    res.status(500).json({ error: 'Failed to fetch favorite videos' });
  }
});

/**
 * Add a video to favorites
 * POST /api/favorites/:id
 */
router.post('/:id', (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Check if video exists
    const checkStmt = db.prepare('SELECT id FROM videos WHERE id = ?');
    const video = checkStmt.get(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Add to favorites (will ignore if already a favorite)
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO favorites (video_id)
      VALUES (?)
    `);
    
    const result = stmt.run(videoId);
    
    // Check if the operation affected any rows (if it was already a favorite, changes will be 0)
    const added = result.changes > 0;
    
    res.json({ 
      success: true, 
      added, 
      message: added ? 'Added to favorites' : 'Already in favorites' 
    });
  } catch (error) {
    console.error('Failed to add to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

/**
 * Remove a video from favorites
 * DELETE /api/favorites/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Remove from favorites
    const stmt = db.prepare('DELETE FROM favorites WHERE video_id = ?');
    const result = stmt.run(videoId);
    
    // Check if any rows were affected
    const removed = result.changes > 0;
    
    res.json({ 
      success: true, 
      removed, 
      message: removed ? 'Removed from favorites' : 'Not in favorites' 
    });
  } catch (error) {
    console.error('Failed to remove from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

/**
 * Helper function to format duration in seconds to HH:MM:SS
 */
function formatDuration(seconds) {
  if (!seconds) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default router;