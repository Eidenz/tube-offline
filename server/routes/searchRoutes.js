import express from 'express';
import { db } from '../config/database.js';
import path from 'path';

const router = express.Router();

/**
 * Search videos by title, description, channel or tags
 * GET /api/search?query=...&type=...
 */
router.get('/', (req, res) => {
  try {
    const { query = '', type = 'all' } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    let searchQuery;
    let params;
    
    const searchTerm = `%${query}%`;
    
    // Build different queries based on search type
    switch (type) {
      case 'title':
        searchQuery = `
          SELECT 
            v.id, v.youtube_id, v.title, v.channel, v.thumbnail_path, 
            v.duration, v.view_count, v.date_added,
            (SELECT MAX(watched_at) FROM history WHERE video_id = v.id) as last_viewed
          FROM videos v
          WHERE v.title LIKE ?
          ORDER BY v.date_added DESC
          LIMIT ? OFFSET ?
        `;
        params = [searchTerm, limit, offset];
        break;
        
      case 'channel':
        searchQuery = `
          SELECT 
            v.id, v.youtube_id, v.title, v.channel, v.thumbnail_path, 
            v.duration, v.view_count, v.date_added,
            (SELECT MAX(watched_at) FROM history WHERE video_id = v.id) as last_viewed
          FROM videos v
          WHERE v.channel LIKE ?
          ORDER BY v.date_added DESC
          LIMIT ? OFFSET ?
        `;
        params = [searchTerm, limit, offset];
        break;
        
      case 'tag':
        searchQuery = `
          SELECT 
            v.id, v.youtube_id, v.title, v.channel, v.thumbnail_path, 
            v.duration, v.view_count, v.date_added,
            (SELECT MAX(watched_at) FROM history WHERE video_id = v.id) as last_viewed
          FROM videos v
          JOIN video_tags vt ON v.id = vt.video_id
          JOIN tags t ON vt.tag_id = t.id
          WHERE t.name LIKE ?
          GROUP BY v.id
          ORDER BY v.date_added DESC
          LIMIT ? OFFSET ?
        `;
        params = [searchTerm, limit, offset];
        break;
        
      default: // 'all'
        searchQuery = `
          SELECT 
            v.id, v.youtube_id, v.title, v.channel, v.thumbnail_path, 
            v.duration, v.view_count, v.date_added,
            (SELECT MAX(watched_at) FROM history WHERE video_id = v.id) as last_viewed
          FROM videos v
          LEFT JOIN video_tags vt ON v.id = vt.video_id
          LEFT JOIN tags t ON vt.tag_id = t.id
          WHERE v.title LIKE ? 
            OR v.description LIKE ? 
            OR v.channel LIKE ?
            OR t.name LIKE ?
          GROUP BY v.id
          ORDER BY v.date_added DESC
          LIMIT ? OFFSET ?
        `;
        params = [searchTerm, searchTerm, searchTerm, searchTerm, limit, offset];
        break;
    }
    
    // Execute search query
    const stmt = db.prepare(searchQuery);
    const videos = stmt.all(...params);
    
    // Get total count for pagination
    let countQuery;
    let countParams;
    
    switch (type) {
      case 'title':
        countQuery = `
          SELECT COUNT(*) as total
          FROM videos v
          WHERE v.title LIKE ?
        `;
        countParams = [searchTerm];
        break;
        
      case 'channel':
        countQuery = `
          SELECT COUNT(*) as total
          FROM videos v
          WHERE v.channel LIKE ?
        `;
        countParams = [searchTerm];
        break;
        
      case 'tag':
        countQuery = `
          SELECT COUNT(DISTINCT v.id) as total
          FROM videos v
          JOIN video_tags vt ON v.id = vt.video_id
          JOIN tags t ON vt.tag_id = t.id
          WHERE t.name LIKE ?
        `;
        countParams = [searchTerm];
        break;
        
      default: // 'all'
        countQuery = `
          SELECT COUNT(DISTINCT v.id) as total
          FROM videos v
          LEFT JOIN video_tags vt ON v.id = vt.video_id
          LEFT JOIN tags t ON vt.tag_id = t.id
          WHERE v.title LIKE ? 
            OR v.description LIKE ? 
            OR v.channel LIKE ?
            OR t.name LIKE ?
        `;
        countParams = [searchTerm, searchTerm, searchTerm, searchTerm];
        break;
    }
    
    const countStmt = db.prepare(countQuery);
    const { total } = countStmt.get(...countParams);
    
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
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * Get all tags
 * GET /api/search/tags
 */
router.get('/tags', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        t.id, t.name,
        COUNT(vt.video_id) as video_count
      FROM tags t
      LEFT JOIN video_tags vt ON t.id = vt.tag_id
      GROUP BY t.id
      ORDER BY video_count DESC, t.name ASC
    `);
    
    const tags = stmt.all();
    res.json(tags);
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * Get top tags by video count
 * GET /api/search/tags/top
 */
router.get('/tags/top', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const stmt = db.prepare(`
      SELECT 
        t.id, t.name,
        COUNT(vt.video_id) as video_count
      FROM tags t
      JOIN video_tags vt ON t.id = vt.tag_id
      GROUP BY t.id
      ORDER BY video_count DESC, t.name ASC
      LIMIT ?
    `);
    
    const topTags = stmt.all(limit);
    res.json(topTags);
  } catch (error) {
    console.error('Failed to fetch top tags:', error);
    res.status(500).json({ error: 'Failed to fetch top tags' });
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