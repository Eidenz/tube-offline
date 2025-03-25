import express from 'express';
import { 
  downloadVideo, 
  getVideoInfo, 
  cancelDownload, 
  getActiveDownloads, 
  getDownloadHistory,
  checkYtDlpInstalled,
  getPlaylistInfo,
  downloadPlaylist
} from '../config/yt-dlp.js';
import { db } from '../config/database.js';

const router = express.Router();

// WebSocket clients for real-time progress updates
const clients = new Map();

/**
 * Add WebSocket client for download updates
 * @param {string} id Client ID
 * @param {WebSocket} ws WebSocket connection
 */
function addClient(id, ws) {
  clients.set(id, ws);
}

/**
 * Remove WebSocket client
 * @param {string} id Client ID
 */
function removeClient(id) {
  clients.delete(id);
}

/**
 * Send progress update to all connected WebSocket clients
 * @param {string} youtubeId YouTube video ID
 * @param {number} progress Download progress (0-100)
 */
function broadcastProgress(youtubeId, progress) {
  const message = JSON.stringify({
    type: 'progress',
    youtubeId,
    progress
  });
  
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

/**
 * Send playlist download progress to all connected WebSocket clients
 * @param {string} playlistId YouTube playlist ID
 * @param {number} videoCount Total videos in playlist
 * @param {number} completed Videos completed
 * @param {string} currentVideo Current video being downloaded
 */
function broadcastPlaylistProgress(playlistId, videoCount, completed, currentVideo) {
  const progress = videoCount > 0 ? (completed / videoCount) * 100 : 0;
  
  const message = JSON.stringify({
    type: 'playlist_progress',
    playlistId,
    videoCount,
    completed,
    currentVideo,
    progress: Math.min(Math.round(progress), 100)
  });
  
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

/**
 * Check if yt-dlp is installed
 * GET /api/download/check
 */
router.get('/check', async (req, res) => {
  try {
    const isInstalled = await checkYtDlpInstalled();
    res.json({ installed: isInstalled });
  } catch (error) {
    console.error('Error checking yt-dlp installation:', error);
    res.status(500).json({ error: 'Failed to check yt-dlp installation' });
  }
});

/**
 * Get video information without downloading
 * GET /api/download/info?url=...
 */
router.get('/info', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const videoInfo = await getVideoInfo(url);
    res.json(videoInfo);
  } catch (error) {
    console.error('Error fetching video info:', error);
    res.status(500).json({ error: 'Failed to fetch video info' });
  }
});

/**
 * Get playlist information without downloading
 * GET /api/download/playlist-info?url=...
 */
router.get('/playlist-info', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const playlistInfo = await getPlaylistInfo(url);
    
    if (playlistInfo) {
      res.json({
        success: true,
        id: playlistInfo.id,
        title: playlistInfo.title,
        channel: playlistInfo.channel || playlistInfo.uploader,
        videoCount: playlistInfo.entries ? playlistInfo.entries.length : 0,
        videos: playlistInfo.entries ? playlistInfo.entries.slice(0, 5).map(entry => ({
          id: entry.id,
          title: entry.title,
          thumbnail: entry.thumbnail
        })) : []
      });
    } else {
      res.status(404).json({ 
        success: false,
        error: 'Could not fetch playlist information' 
      });
    }
  } catch (error) {
    console.error('Error fetching playlist info:', error);
    res.status(500).json({ error: 'Failed to fetch playlist info' });
  }
});

/**
 * Start a new download
 * POST /api/download
 * Body: { url, quality, downloadSubtitles }
 */
router.post('/', async (req, res) => {
  try {
    const { 
      url, 
      quality = '1080', 
      downloadSubtitles = true,
      addToPlaylistId = null  // New parameter for playlist ID
    } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Check if URL is already being downloaded
    const checkStmt = db.prepare(`
      SELECT * FROM downloads 
      WHERE url = ? AND (status = 'downloading' OR status = 'pending')
    `);
    
    const existingDownload = checkStmt.get(url);
    
    if (existingDownload) {
      return res.status(409).json({ 
        error: 'This URL is already being downloaded',
        download: existingDownload
      });
    }
    
    // If addToPlaylistId is provided, store it with the download
    if (addToPlaylistId) {
      // Store in database that this download should be added to a playlist
      const insertStmt = db.prepare(`
        INSERT INTO downloads (
          youtube_id, url, title, status, quality, 
          download_subtitles, playlist_target_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(youtube_id) DO UPDATE SET
        playlist_target_id = excluded.playlist_target_id
      `);
      
      try {
        // Get video info to get YouTube ID
        const videoInfo = await getVideoInfo(url);
        if (videoInfo && videoInfo.id) {
          insertStmt.run(
            videoInfo.id,
            url,
            videoInfo.title || 'YouTube Video',
            'pending',
            quality,
            downloadSubtitles ? 1 : 0,
            addToPlaylistId
          );
        }
      } catch (err) {
        console.error('Error getting video info for playlist addition:', err);
        // Continue with download even if this fails
      }
    }
    
    // Start download process in the background
    res.status(202).json({ message: 'Download started' });
    
    // Perform the download in the background
    downloadVideo(url, quality, downloadSubtitles, broadcastProgress)
      .then(result => {
        console.log('Download completed:', result);
        
        // If this download should be added to a playlist, do it now
        if (addToPlaylistId && result && result.id) {
          try {
            // Get the videoId from the result
            const videoId = result.id;
            
            // Add to playlist
            const addToPlaylistStmt = db.prepare(`
              INSERT OR IGNORE INTO playlist_videos (playlist_id, video_id, position)
              VALUES (?, ?, (
                SELECT COALESCE(MAX(position), 0) + 1
                FROM playlist_videos
                WHERE playlist_id = ?
              ))
            `);
            
            addToPlaylistStmt.run(addToPlaylistId, videoId, addToPlaylistId);
            console.log(`Added video ${videoId} to playlist ${addToPlaylistId} after download`);
          } catch (err) {
            console.error('Error adding video to playlist after download:', err);
          }
        }
      })
      .catch(error => {
        console.error('Download failed:', error);
      });
      
  } catch (error) {
    console.error('Error starting download:', error);
    res.status(500).json({ error: 'Failed to start download' });
  }
});

/**
 * Start a new playlist download
 * POST /api/download/playlist
 * Body: { url, quality, downloadSubtitles, playlistId }
 */
router.post('/playlist', async (req, res) => {
  try {
    const { 
      url, 
      quality = '720', 
      downloadSubtitles = true,
      playlistId = null  // Local playlist ID to add videos to
    } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Playlist URL is required' });
    }
    
    // Check if URL is already being downloaded
    const checkStmt = db.prepare(`
      SELECT * FROM downloads 
      WHERE url = ? AND (status = 'downloading' OR status = 'pending')
    `);
    
    const existingDownload = checkStmt.get(url);
    
    if (existingDownload) {
      return res.status(409).json({ 
        error: 'This playlist is already being downloaded',
        download: existingDownload
      });
    }
    
    // First get basic info about the playlist
    try {
      const playlistInfo = await getPlaylistInfo(url);
      
      if (!playlistInfo || !playlistInfo.id) {
        return res.status(400).json({ 
          error: 'Invalid playlist URL or could not fetch playlist information'
        });
      }
      
      // Log full playlist info for debugging
      console.log('Playlist info obtained:', {
        id: playlistInfo.id,
        title: playlistInfo.title,
        type: playlistInfo._type,
        entries: playlistInfo.entries ? 
          `${playlistInfo.entries.length} videos` : 
          'No entries found'
      });
      
      if (!playlistInfo.entries || playlistInfo.entries.length === 0) {
        console.log('WARNING: No entries found in playlist');
      }
      
      // Store basic info about the playlist download
      const insertStmt = db.prepare(`
        INSERT INTO downloads (
          youtube_id, url, title, status, quality, 
          download_subtitles, is_playlist, playlist_size
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run(
        playlistInfo.id,
        url,
        playlistInfo.title || 'YouTube Playlist',
        'pending',
        quality,
        downloadSubtitles ? 1 : 0,
        1,
        playlistInfo.entries ? playlistInfo.entries.length : 0
      );
      
      // Start download process in the background
      res.status(202).json({ 
        message: 'Playlist download started',
        playlistId: playlistInfo.id,
        title: playlistInfo.title,
        videoCount: playlistInfo.entries ? playlistInfo.entries.length : 0
      });
      
      // Perform the download in the background
      downloadPlaylist(
        url, 
        quality, 
        downloadSubtitles, 
        playlistId, 
        (plId, count, completed, current) => {
          broadcastPlaylistProgress(plId, count, completed, current);
        }
      )
        .then(result => {
          console.log('Playlist download completed:', result);
        })
        .catch(error => {
          console.error('Playlist download failed:', error);
        });
    } catch (error) {
      console.error('Error fetching playlist info:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch playlist information',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error starting playlist download:', error);
    res.status(500).json({ error: 'Failed to start playlist download' });
  }
});

/**
 * Cancel an active download
 * DELETE /api/download/:youtubeId
 */
router.delete('/:youtubeId', async (req, res) => {
  try {
    const { youtubeId } = req.params;
    
    const success = await cancelDownload(youtubeId);
    
    if (!success) {
      return res.status(404).json({ error: 'Download not found or already completed' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling download:', error);
    res.status(500).json({ error: 'Failed to cancel download' });
  }
});

/**
 * Get active downloads
 * GET /api/download/active
 */
router.get('/active', (req, res) => {
  try {
    const downloads = getActiveDownloads();
    res.json(downloads);
  } catch (error) {
    console.error('Error fetching active downloads:', error);
    res.status(500).json({ error: 'Failed to fetch active downloads' });
  }
});

/**
 * Get download history
 * GET /api/download/history
 */
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const downloads = getDownloadHistory(limit, offset);
    
    // Get total count for pagination
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM downloads');
    const { total } = countStmt.get();
    
    res.json({
      downloads,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching download history:', error);
    res.status(500).json({ error: 'Failed to fetch download history' });
  }
});

export {
  router,
  addClient,
  removeClient,
  broadcastProgress,
  broadcastPlaylistProgress
};