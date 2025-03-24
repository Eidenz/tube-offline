import express from 'express';
import { 
  downloadVideo, 
  getVideoInfo, 
  cancelDownload, 
  getActiveDownloads, 
  getDownloadHistory,
  checkYtDlpInstalled
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
 * Start a new download
 * POST /api/download
 * Body: { url, quality, downloadSubtitles }
 */
router.post('/', async (req, res) => {
  try {
    const { url, quality = '720', downloadSubtitles = true } = req.body;
    
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
    
    // Start download process in the background
    res.status(202).json({ message: 'Download started' });
    
    // Perform the download in the background
    downloadVideo(url, quality, downloadSubtitles, broadcastProgress)
      .then(result => {
        console.log('Download completed:', result);
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
  broadcastProgress
};