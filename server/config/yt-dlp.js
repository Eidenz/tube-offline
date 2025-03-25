import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db } from './database.js';
import config from '../config.js';
// Import the broadcastDownloadComplete function from websocket.js
import { broadcastDownloadComplete } from '../websocket.js';

// Get current directory (ES Module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths for storing downloaded content from config
const videosDir = config.videosDir;
const thumbnailsDir = config.thumbnailsDir;
const subtitlesDir = config.subtitlesDir;

// Ensure directories exist
[videosDir, thumbnailsDir, subtitlesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Get video information using yt-dlp
 * @param {string} url YouTube URL
 * @returns {Promise<Object>} Video information
 */
function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      url
    ];
    
    const ytDlp = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';
    
    ytDlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    ytDlp.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ytDlp.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp process failed with code ${code}: ${stderr}`));
      }
      
      try {
        const videoInfo = JSON.parse(stdout);
        resolve(videoInfo);
      } catch (error) {
        reject(new Error(`Failed to parse yt-dlp output: ${error.message}`));
      }
    });
  });
}

/**
 * Download a YouTube video
 * @param {string} url YouTube URL
 * @param {string} quality Video quality (e.g. '1080', '720', '480', '360', 'audio')
 * @param {boolean} downloadSubtitles Whether to download subtitles
 * @param {Function} progressCallback Callback for download progress updates
 * @returns {Promise<Object>} Download result with file paths
 */
function downloadVideo(url, quality, downloadSubtitles = true, progressCallback = () => {}) {
  return new Promise(async (resolve, reject) => {
    try {
      // First get video info to extract ID and other metadata
      const videoInfo = await getVideoInfo(url);
      const youtubeId = videoInfo.id;
      
      // Update download status in database
      const downloadStmt = db.prepare(`
        INSERT INTO downloads (youtube_id, url, title, status, quality, download_subtitles)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(youtube_id) DO UPDATE SET
        status = excluded.status,
        progress = 0,
        date_started = CURRENT_TIMESTAMP,
        date_completed = NULL,
        error_message = NULL
      `);
      
      downloadStmt.run(youtubeId, url, videoInfo.title, 'downloading', quality, downloadSubtitles ? 1 : 0);
      
      // Prepare file paths
      const baseFileName = `${youtubeId}`;
      const videoOutputPath = path.join(videosDir, baseFileName);
      const thumbnailFileDest = path.join(thumbnailsDir, `${baseFileName}.jpg`);
      const subtitleFileDest = downloadSubtitles ? path.join(subtitlesDir, `${baseFileName}.en.vtt`) : null;

      // Prepare yt-dlp arguments
      let args = [
        '--format', getFormatString(quality),
        '--output', `${videoOutputPath}.%(ext)s`,
        '--write-thumbnail',
        '--add-metadata',
        '--convert-thumbnails', 'jpg',
        '--restrict-filenames',
        '--no-playlist',
      ];
      
      // Add subtitle arguments if needed
      if (downloadSubtitles) {
        args = [
          ...args,
          '--write-subs',
          '--write-auto-subs',
          '--sub-langs', 'en',
          '--sub-format', 'vtt',
          '--convert-subs', 'vtt',
        ];
      }
      
      // Add the URL as the last argument
      args.push(url);
      
      const ytDlp = spawn('yt-dlp', args);
      let stderr = '';
      
      ytDlp.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Parse download progress
        const progressMatch = output.match(/(\d+\.\d+)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          
          // Update progress in the database
          const updateProgressStmt = db.prepare(`
            UPDATE downloads SET progress = ? WHERE youtube_id = ?
          `);
          updateProgressStmt.run(progress, youtubeId);
          
          // Call progress callback
          progressCallback(youtubeId, progress);
        }
      });
      
      ytDlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ytDlp.on('close', async (code) => {
        if (code !== 0) {
          // Update database with error
          const updateErrorStmt = db.prepare(`
            UPDATE downloads SET 
            status = 'failed', 
            error_message = ?, 
            date_completed = CURRENT_TIMESTAMP
            WHERE youtube_id = ?
          `);
          updateErrorStmt.run(stderr, youtubeId);
          
          return reject(new Error(`yt-dlp process failed with code ${code}: ${stderr}`));
        }
        
        try {
          // Find the actual video file
          const files = fs.readdirSync(videosDir);
          let videoFileName = null;
          let thumbnailFileName = null;
          let subtitleFileName = null;
          
          // Look for video file (should be anything not jpg or vtt)
          for (const file of files) {
            if (file.startsWith(baseFileName)) {
              const ext = path.extname(file).toLowerCase();
              
              if (ext !== '.jpg' && ext !== '.vtt') {
                videoFileName = file;
              } else if (ext === '.jpg') {
                thumbnailFileName = file;
              } else if (ext === '.vtt' && file.includes('.en')) {
                subtitleFileName = file;
              }
            }
          }
          
          if (!videoFileName) {
            throw new Error('Video file not found after download');
          }
          
          // Actual file paths
          const videoFile = path.join(videosDir, videoFileName);
          
          // Move thumbnail file if found
          let thumbnailFile = null;
          if (thumbnailFileName) {
            const sourcePath = path.join(videosDir, thumbnailFileName);
            fs.renameSync(sourcePath, thumbnailFileDest);
            thumbnailFile = thumbnailFileDest;
          }
          
          // Move subtitle file if found
          let subtitleFile = null;
          if (subtitleFileName && downloadSubtitles) {
            const sourcePath = path.join(videosDir, subtitleFileName);
            fs.renameSync(sourcePath, subtitleFileDest);
            subtitleFile = subtitleFileDest;
          }
          
          // Store relative paths for database (relative to app root)
          // For Docker, we can just store the bare filenames since they'll be in known directories
          const relativeVideoPath = path.relative(path.join(__dirname, '..', '..'), videoFile);
          const relativeThumbnailPath = thumbnailFile ? path.relative(path.join(__dirname, '..', '..'), thumbnailFile) : null;
          const relativeSubtitlePath = subtitleFile ? path.relative(path.join(__dirname, '..', '..'), subtitleFile) : null;
          
          const insertVideoStmt = db.prepare(`
            INSERT INTO videos (
              youtube_id, title, description, channel, 
              thumbnail_path, video_path, subtitle_path, 
              duration, metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(youtube_id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            channel = excluded.channel,
            thumbnail_path = excluded.thumbnail_path,
            video_path = excluded.video_path,
            subtitle_path = excluded.subtitle_path,
            duration = excluded.duration,
            metadata = excluded.metadata
          `);
          
          // Insert video into database
          insertVideoStmt.run(
            youtubeId,
            videoInfo.title,
            videoInfo.description,
            videoInfo.channel,
            relativeThumbnailPath,
            relativeVideoPath,
            relativeSubtitlePath,
            videoInfo.duration,
            JSON.stringify(videoInfo)
          );
          
          // Update download status to completed
          const completeDownloadStmt = db.prepare(`
            UPDATE downloads SET 
            status = 'completed', 
            progress = 100, 
            date_completed = CURRENT_TIMESTAMP
            WHERE youtube_id = ?
          `);
          completeDownloadStmt.run(youtubeId);
          
          // Extract tags from video info and add them to the database
          if (videoInfo.tags && videoInfo.tags.length > 0) {
            const insertTagStmt = db.prepare(`
              INSERT OR IGNORE INTO tags (name) VALUES (?)
            `);
            
            const linkTagStmt = db.prepare(`
              INSERT OR IGNORE INTO video_tags (video_id, tag_id)
              SELECT 
                (SELECT id FROM videos WHERE youtube_id = ?),
                (SELECT id FROM tags WHERE name = ?)
            `);
            
            // Add each tag
            for (const tag of videoInfo.tags) {
              insertTagStmt.run(tag);
              linkTagStmt.run(youtubeId, tag);
            }
          }

          // Prepare a response object with video data that we can use for notifications
          const videoData = {
            id: youtubeId,
            title: videoInfo.title,
            videoPath: relativeVideoPath,
            thumbnailPath: relativeThumbnailPath,
            subtitlePath: relativeSubtitlePath,
            duration: videoInfo.duration
          };

          broadcastDownloadComplete(youtubeId, videoData);
          
          // Return download result
          resolve(videoData);
          
        } catch (error) {
          // Update database with error
          const updateErrorStmt = db.prepare(`
            UPDATE downloads SET 
            status = 'failed', 
            error_message = ?, 
            date_completed = CURRENT_TIMESTAMP
            WHERE youtube_id = ?
          `);
          updateErrorStmt.run(error.message, youtubeId);
          
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get format string based on quality setting
 * @param {string} quality Quality setting ('best', '1080', '720', '480', '360', 'audio')
 * @returns {string} Format string for yt-dlp
 */
function getFormatString(quality) {
  switch (quality) {
    case 'best':
      return 'bestvideo+bestaudio/best'; // Always get highest quality
    case '1080':
      return 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
    case '720':
      return 'bestvideo[height<=720]+bestaudio/best[height<=720]';
    case '480':
      return 'bestvideo[height<=480]+bestaudio/best[height<=480]';
    case '360':
      return 'bestvideo[height<=360]+bestaudio/best[height<=360]';
    case 'audio':
      return 'bestaudio/best';
    default:
      return 'bestvideo+bestaudio/best'; // Default to best quality
  }
}

/**
 * Cancel an active download
 * @param {string} youtubeId YouTube video ID
 * @returns {Promise<boolean>} Success status
 */
async function cancelDownload(youtubeId) {
  return new Promise((resolve, reject) => {
    try {
      // Find the download in the database
      const downloadStmt = db.prepare(`
        SELECT * FROM downloads WHERE youtube_id = ? AND status = 'downloading'
      `);
      const download = downloadStmt.get(youtubeId);
      
      if (!download) {
        return resolve(false);
      }
      
      // Find and kill the yt-dlp process
      const findProcess = spawn('pgrep', ['-f', `yt-dlp.*${youtubeId}`]);
      let pids = '';
      
      findProcess.stdout.on('data', (data) => {
        pids += data.toString();
      });
      
      findProcess.on('close', (code) => {
        if (pids.trim()) {
          // Kill the process
          const pidList = pids.trim().split('\n');
          pidList.forEach(pid => {
            try {
              process.kill(parseInt(pid, 10), 'SIGTERM');
            } catch (error) {
              console.error(`Failed to kill process ${pid}:`, error);
            }
          });
        }
        
        // Update the download status
        const updateStmt = db.prepare(`
          UPDATE downloads SET 
          status = 'cancelled', 
          date_completed = CURRENT_TIMESTAMP
          WHERE youtube_id = ?
        `);
        updateStmt.run(youtubeId);
        
        // Clean up any partially downloaded files
        const baseFileName = youtubeId;
        
        // Find files that start with the youtubeId in the videos directory
        const videoFiles = fs.readdirSync(videosDir)
          .filter(file => file.startsWith(baseFileName))
          .map(file => path.join(videosDir, file));
          
        // Find thumbnail files
        const thumbnailFile = path.join(thumbnailsDir, `${baseFileName}.jpg`);
        
        // Find subtitle files
        const subtitleFile = path.join(subtitlesDir, `${baseFileName}.en.vtt`);
        
        // Delete all found files
        [...videoFiles, thumbnailFile, subtitleFile].forEach(filePath => {
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(`Deleted file: ${filePath}`);
            } catch (error) {
              console.error(`Failed to delete file ${filePath}:`, error);
            }
          }
        });
        
        resolve(true);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get active downloads
 * @returns {Array} List of active downloads
 */
function getActiveDownloads() {
  const stmt = db.prepare(`
    SELECT * FROM downloads 
    WHERE status = 'downloading' OR status = 'pending'
    ORDER BY date_started DESC
  `);
  return stmt.all();
}

/**
 * Get download history
 * @param {number} limit Number of items to return
 * @param {number} offset Offset for pagination
 * @returns {Array} List of downloads
 */
function getDownloadHistory(limit = 20, offset = 0) {
  const stmt = db.prepare(`
    SELECT * FROM downloads 
    ORDER BY date_started DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(limit, offset);
}

/**
 * Check if yt-dlp is installed and accessible
 * @returns {Promise<boolean>} Whether yt-dlp is installed
 */
function checkYtDlpInstalled() {
  return new Promise((resolve) => {
    const ytDlp = spawn('yt-dlp', ['--version']);
    
    ytDlp.on('error', () => {
      resolve(false);
    });
    
    ytDlp.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

export {
  downloadVideo,
  getVideoInfo,
  cancelDownload,
  getActiveDownloads,
  getDownloadHistory,
  checkYtDlpInstalled
};