import express from 'express';
import { db } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory (ES Module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * Get all videos with pagination
 * GET /api/videos?limit=10&offset=0
 */
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const stmt = db.prepare(`
      SELECT 
        v.id, v.youtube_id, v.title, v.channel, v.thumbnail_path, 
        v.duration, v.view_count, v.date_added,
        (SELECT COUNT(*) FROM history WHERE video_id = v.id) as view_count,
        (SELECT MAX(watched_at) FROM history WHERE video_id = v.id) as last_viewed
      FROM videos v
      ORDER BY v.date_added DESC
      LIMIT ? OFFSET ?
    `);
    
    const videos = stmt.all(limit, offset);
    
    // Get total count for pagination
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM videos');
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
    console.error('Failed to fetch videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

/**
 * Get a single video by ID
 * GET /api/videos/:id
 */
router.get('/:id', (req, res) => {
  try {
    const videoId = req.params.id;
    
    const stmt = db.prepare(`
      SELECT 
        v.*, 
        (SELECT COUNT(*) FROM history WHERE video_id = v.id) as view_count,
        (SELECT MAX(watched_at) FROM history WHERE video_id = v.id) as last_viewed
      FROM videos v
      WHERE v.id = ? OR v.youtube_id = ?
    `);
    
    const video = stmt.get(videoId, videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Get video tags
    const tagsStmt = db.prepare(`
      SELECT t.id, t.name
      FROM tags t
      JOIN video_tags vt ON t.id = vt.tag_id
      WHERE vt.video_id = ?
    `);
    
    const tags = tagsStmt.all(video.id);
    
    // Parse metadata
    let parsedMetadata = null;
    try {
      parsedMetadata = video.metadata ? JSON.parse(video.metadata) : null;
    } catch (e) {
      console.error('Error parsing video metadata:', e);
      parsedMetadata = null;
    }
    
    // Format response
    const formattedVideo = {
      ...video,
      tags,
      video_url: `/videos/${path.basename(video.video_path)}`,
      thumbnail_url: `/thumbnails/${path.basename(video.thumbnail_path)}`,
      subtitle_url: video.subtitle_path ? `/subtitles/${path.basename(video.subtitle_path)}` : null,
      duration_formatted: formatDuration(video.duration),
      metadata: parsedMetadata
    };
    
    res.json(formattedVideo);
  } catch (error) {
    console.error('Failed to fetch video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

/**
 * Record video viewing history
 * POST /api/videos/:id/view
 */
router.post('/:id/view', (req, res) => {
  try {
    const videoId = req.params.id;
    const { duration } = req.body;
    
    // Insert viewing history
    const stmt = db.prepare(`
      INSERT INTO history (video_id, watch_duration)
      VALUES (?, ?)
    `);
    
    stmt.run(videoId, duration || 0);
    
    // Update last_viewed timestamp
    const updateStmt = db.prepare(`
      UPDATE videos SET last_viewed = CURRENT_TIMESTAMP WHERE id = ?
    `);
    
    updateStmt.run(videoId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to record video view:', error);
    res.status(500).json({ error: 'Failed to record video view' });
  }
});

/**
 * Get recently viewed videos
 * GET /api/videos/history/recent
 */
router.get('/history/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const stmt = db.prepare(`
      SELECT 
        v.id, v.youtube_id, v.title, v.channel, v.thumbnail_path, 
        v.duration, MAX(h.watched_at) as last_viewed
      FROM videos v
      JOIN history h ON v.id = h.video_id
      GROUP BY v.id
      ORDER BY last_viewed DESC
      LIMIT ?
    `);
    
    const videos = stmt.all(limit);
    
    // Format response
    const formattedVideos = videos.map(video => ({
      ...video,
      thumbnail_url: `/thumbnails/${path.basename(video.thumbnail_path)}`,
      duration_formatted: formatDuration(video.duration)
    }));
    
    res.json(formattedVideos);
  } catch (error) {
    console.error('Failed to fetch recent videos:', error);
    res.status(500).json({ error: 'Failed to fetch recent videos' });
  }
});

/**
 * Delete a video
 * DELETE /api/videos/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Get video info before deletion to delete files
    const getVideoStmt = db.prepare(`
      SELECT video_path, thumbnail_path, subtitle_path FROM videos
      WHERE id = ? OR youtube_id = ?
    `);
    
    const video = getVideoStmt.get(videoId, videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Delete the video from database
    const deleteStmt = db.prepare(`
      DELETE FROM videos WHERE id = ? OR youtube_id = ?
    `);
    
    deleteStmt.run(videoId, videoId);
    
    // Delete files if they exist
    [video.video_path, video.thumbnail_path, video.subtitle_path].forEach(filePath => {
      if (filePath) {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
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

/**
 * Get related videos based on shared tags
 * GET /api/videos/:id/related
 */
router.get('/:id/related', (req, res) => {
  try {
    const videoId = req.params.id;
    const limit = parseInt(req.query.limit) || 6;
    
    // First, get all tags for the current video
    const getTagsStmt = db.prepare(`
      SELECT t.id, t.name
      FROM tags t
      JOIN video_tags vt ON t.id = vt.tag_id
      WHERE vt.video_id = ?
    `);
    
    const tags = getTagsStmt.all(videoId);
    
    if (!tags || tags.length === 0) {
      // If no tags, return recent videos as fallback
      const recentStmt = db.prepare(`
        SELECT 
          v.id, v.youtube_id, v.title, v.channel, v.thumbnail_path, 
          v.duration, v.view_count, v.date_added
        FROM videos v 
        WHERE v.id != ?
        ORDER BY v.date_added DESC
        LIMIT ?
      `);
      
      const recentVideos = recentStmt.all(videoId, limit);
      
      // Format response
      const formattedVideos = recentVideos.map(video => ({
        ...video,
        thumbnail_url: `/thumbnails/${path.basename(video.thumbnail_path)}`,
        duration_formatted: formatDuration(video.duration),
        sharedTags: []
      }));
      
      return res.json(formattedVideos);
    }
    
    // Get tag IDs
    const tagIds = tags.map(tag => tag.id);
    
    // Use a complex query to find videos that share tags with the current video
    // and calculate a similarity score based on the number of shared tags
    const relatedStmt = db.prepare(`
      WITH shared_tags AS (
        SELECT 
          v.id AS video_id,
          t.id AS tag_id,
          t.name AS tag_name,
          COUNT(*) OVER (PARTITION BY v.id) AS tag_count
        FROM videos v
        JOIN video_tags vt ON v.id = vt.video_id
        JOIN tags t ON vt.tag_id = t.id
        WHERE vt.tag_id IN (${tagIds.map(() => '?').join(',')})
        AND v.id != ?
      )
      SELECT 
        v.id, v.youtube_id, v.title, v.channel, v.thumbnail_path, 
        v.duration, v.view_count, v.date_added,
        MAX(st.tag_count) AS shared_tag_count,
        GROUP_CONCAT(st.tag_id || ':' || st.tag_name, '|') AS shared_tags_data
      FROM videos v
      JOIN shared_tags st ON v.id = st.video_id
      GROUP BY v.id
      ORDER BY shared_tag_count DESC, v.date_added DESC
      LIMIT ?
    `);
    
    // Execute query with tag IDs and current video ID as parameters
    const params = [...tagIds, videoId, limit];
    const relatedVideos = relatedStmt.all(...params);
    
    // Process results and format shared tags
    const formattedVideos = relatedVideos.map(video => {
      // Parse shared tags data
      let sharedTags = [];
      if (video.shared_tags_data) {
        sharedTags = video.shared_tags_data.split('|').map(item => {
          const [tagId, tagName] = item.split(':');
          return { id: parseInt(tagId), name: tagName };
        });
      }
      
      return {
        ...video,
        thumbnail_url: `/thumbnails/${path.basename(video.thumbnail_path)}`,
        duration_formatted: formatDuration(video.duration),
        sharedTags: sharedTags
      };
    });
    
    res.json(formattedVideos);
  } catch (error) {
    console.error('Failed to fetch related videos:', error);
    res.status(500).json({ error: 'Failed to fetch related videos' });
  }
});

export default router;