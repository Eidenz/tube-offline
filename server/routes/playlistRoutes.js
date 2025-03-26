import express from 'express';
import { db } from '../config/database.js';
import path from 'path';

const router = express.Router();

/**
 * Get all playlists with thumbnails
 * GET /api/playlists
 */
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        p.*,
        COUNT(pv.video_id) as video_count
      FROM playlists p
      LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
      GROUP BY p.id
      ORDER BY p.date_created DESC
    `);
    
    const playlists = stmt.all();
    
    // Add thumbnail URLs
    const playlistsWithThumbnails = playlists.map(playlist => {
      const thumbnailUrl = getPlaylistThumbnailUrl(playlist.id, playlist.thumbnail_id);
      
      return {
        ...playlist,
        thumbnail_url: thumbnailUrl
      };
    });
    
    res.json(playlistsWithThumbnails);
  } catch (error) {
    console.error('Failed to fetch playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

/**
 * Create a new playlist
 * POST /api/playlists
 * Body: { name, description, thumbnail_id }
 */
router.post('/', (req, res) => {
  try {
    const { name, description, thumbnail_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO playlists (name, description, thumbnail_id)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(name, description || '', thumbnail_id || null);
    
    const newPlaylist = {
      id: result.lastInsertRowid,
      name,
      description: description || '',
      thumbnail_id: thumbnail_id || null,
      date_created: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      video_count: 0
    };
    
    res.status(201).json(newPlaylist);
  } catch (error) {
    console.error('Failed to create playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

/**
 * Get a single playlist with its videos and thumbnail
 * GET /api/playlists/:id
 */
router.get('/:id', (req, res) => {
  try {
    const playlistId = req.params.id;
    
    // Get playlist details
    const playlistStmt = db.prepare(`
      SELECT 
        p.*,
        COUNT(pv.video_id) as video_count
      FROM playlists p
      LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
      WHERE p.id = ?
      GROUP BY p.id
    `);
    
    const playlist = playlistStmt.get(playlistId);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Get videos in the playlist
    const videosStmt = db.prepare(`
      SELECT 
        v.id, v.youtube_id, v.title, v.channel, v.thumbnail_path, 
        v.duration, v.view_count, pv.position,
        (SELECT MAX(watched_at) FROM history WHERE video_id = v.id) as last_viewed
      FROM videos v
      JOIN playlist_videos pv ON v.id = pv.video_id
      WHERE pv.playlist_id = ?
      ORDER BY pv.position ASC
    `);
    
    const videos = videosStmt.all(playlistId);
    
    // Get thumbnail URL
    const thumbnailUrl = getPlaylistThumbnailUrl(playlistId, playlist.thumbnail_id);
    
    // Format response
    const formattedVideos = videos.map(video => ({
      ...video,
      thumbnail_url: `/thumbnails/${path.basename(video.thumbnail_path)}`,
      duration_formatted: formatDuration(video.duration)
    }));
    
    res.json({
      ...playlist,
      thumbnail_url: thumbnailUrl,
      videos: formattedVideos
    });
  } catch (error) {
    console.error('Failed to fetch playlist:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

/**
 * Update a playlist
 * PUT /api/playlists/:id
 * Body: { name, description, thumbnail_id }
 */
router.put('/:id', (req, res) => {
  try {
    const playlistId = req.params.id;
    const { name, description, thumbnail_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }
    
    // Check if playlist exists
    const checkStmt = db.prepare('SELECT id FROM playlists WHERE id = ?');
    const playlist = checkStmt.get(playlistId);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Update playlist
    const updateStmt = db.prepare(`
      UPDATE playlists 
      SET name = ?, description = ?, thumbnail_id = ?, last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateStmt.run(name, description || '', thumbnail_id, playlistId);
    
    // Get updated playlist
    const getStmt = db.prepare(`
      SELECT 
        p.*,
        COUNT(pv.video_id) as video_count
      FROM playlists p
      LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
      WHERE p.id = ?
      GROUP BY p.id
    `);
    
    const updatedPlaylist = getStmt.get(playlistId);
    
    res.json(updatedPlaylist);
  } catch (error) {
    console.error('Failed to update playlist:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

/**
 * Delete a playlist
 * DELETE /api/playlists/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const playlistId = req.params.id;
    
    // Check if playlist exists
    const checkStmt = db.prepare('SELECT id FROM playlists WHERE id = ?');
    const playlist = checkStmt.get(playlistId);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Delete playlist (cascade will remove playlist_videos entries)
    const deleteStmt = db.prepare('DELETE FROM playlists WHERE id = ?');
    deleteStmt.run(playlistId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete playlist:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

/**
 * Add a video to a playlist
 * POST /api/playlists/:id/videos
 * Body: { videoId }
 */
router.post('/:id/videos', (req, res) => {
  try {
    const playlistId = req.params.id;
    const { videoId } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Check if playlist exists
    const checkPlaylistStmt = db.prepare('SELECT id FROM playlists WHERE id = ?');
    const playlist = checkPlaylistStmt.get(playlistId);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Check if video exists
    const checkVideoStmt = db.prepare('SELECT id FROM videos WHERE id = ? OR youtube_id = ?');
    const video = checkVideoStmt.get(videoId, videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Get the next position in the playlist
    const positionStmt = db.prepare(`
      SELECT COALESCE(MAX(position), 0) + 1 as next_position
      FROM playlist_videos
      WHERE playlist_id = ?
    `);
    
    const { next_position } = positionStmt.get(playlistId);
    
    // Add video to playlist
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO playlist_videos (playlist_id, video_id, position)
      VALUES (?, ?, ?)
    `);
    
    insertStmt.run(playlistId, video.id, next_position);
    
    // Update playlist last_updated
    const updateStmt = db.prepare(`
      UPDATE playlists SET last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateStmt.run(playlistId);
    
    res.json({ success: true, position: next_position });
  } catch (error) {
    console.error('Failed to add video to playlist:', error);
    res.status(500).json({ error: 'Failed to add video to playlist' });
  }
});

/**
 * Remove a video from a playlist
 * DELETE /api/playlists/:id/videos/:videoId
 */
router.delete('/:id/videos/:videoId', (req, res) => {
  try {
    const playlistId = req.params.id;
    const videoId = req.params.videoId;
    
    // Delete video from playlist
    const deleteStmt = db.prepare(`
      DELETE FROM playlist_videos
      WHERE playlist_id = ? AND video_id = ?
    `);
    
    deleteStmt.run(playlistId, videoId);
    
    // Update playlist last_updated
    const updateStmt = db.prepare(`
      UPDATE playlists SET last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateStmt.run(playlistId);
    
    // Reorder remaining videos
    const reorderStmt = db.prepare(`
      UPDATE playlist_videos
      SET position = (
        SELECT COUNT(*) 
        FROM playlist_videos pv2 
        WHERE pv2.playlist_id = ? AND pv2.video_id < playlist_videos.video_id
      ) + 1
      WHERE playlist_id = ?
    `);
    
    reorderStmt.run(playlistId, playlistId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to remove video from playlist:', error);
    res.status(500).json({ error: 'Failed to remove video from playlist' });
  }
});

/**
 * Reorder videos in a playlist
 * PUT /api/playlists/:id/reorder
 * Body: { videoIds: [id1, id2, id3, ...] }
 */
router.put('/:id/reorder', (req, res) => {
  try {
    const playlistId = req.params.id;
    const { videoIds } = req.body;
    
    if (!videoIds || !Array.isArray(videoIds)) {
      return res.status(400).json({ error: 'Video IDs array is required' });
    }
    
    // Start a transaction for the reordering
    db.prepare('BEGIN TRANSACTION').run();
    
    try {
      // Update positions for each video
      const updateStmt = db.prepare(`
        UPDATE playlist_videos
        SET position = ?
        WHERE playlist_id = ? AND video_id = ?
      `);
      
      videoIds.forEach((videoId, index) => {
        updateStmt.run(index + 1, playlistId, videoId);
      });
      
      // Update playlist last_updated
      const updatePlaylistStmt = db.prepare(`
        UPDATE playlists SET last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      updatePlaylistStmt.run(playlistId);
      
      // Commit the transaction
      db.prepare('COMMIT').run();
      
      res.json({ success: true });
    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Failed to reorder playlist:', error);
    res.status(500).json({ error: 'Failed to reorder playlist' });
  }
});

/**
 * Helper function to get playlist thumbnail URL
 * @param {number} playlistId - Playlist ID
 * @param {string} thumbnailId - Video ID used for thumbnail
 * @returns {string|null} Thumbnail URL or null
 */
function getPlaylistThumbnailUrl(playlistId, thumbnailId) {
  if (!thumbnailId) {
    return null;
  }
  
  try {
    // Look up the video to get its thumbnail path
    const stmt = db.prepare(`
      SELECT thumbnail_path FROM videos WHERE id = ? OR youtube_id = ?
    `);
    
    const video = stmt.get(thumbnailId, thumbnailId);
    
    if (video && video.thumbnail_path) {
      // Convert to relative URL
      return `/thumbnails/${path.basename(video.thumbnail_path)}`;
    }
    
    return null;
  } catch (err) {
    console.error(`Error getting thumbnail for playlist ${playlistId}:`, err);
    return null;
  }
}

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