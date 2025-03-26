import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from './NotificationContext';
import axios from 'axios';

const API_URL = '/api';
const DOWNLOAD_API = `${API_URL}/download`;

const DownloadContext = createContext();

export const useDownload = () => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownload must be used within a DownloadProvider');
  }
  return context;
};

export const DownloadProvider = ({ children }) => {
  const [activeDownloads, setActiveDownloads] = useState([]);
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isYtDlpInstalled, setIsYtDlpInstalled] = useState(true);
  const { success, error } = useNotification();

  // Track completed downloads to avoid duplicate notifications
  const completedDownloadsRef = useRef(new Set());

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Check if yt-dlp is installed
    const checkYtDlp = async () => {
      try {
        const response = await axios.get(`${DOWNLOAD_API}/check`);
        setIsYtDlpInstalled(response.data.installed);
      } catch (err) {
        console.error('Failed to check if yt-dlp is installed:', err);
        setIsYtDlpInstalled(false);
      }
    };

    checkYtDlp();

    // Fetch active downloads right away
    fetchActiveDownloads();
    
    // Set up WebSocket with a relative URL that works regardless of deployment environment
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    console.log('Connecting to WebSocket at:', wsUrl);
    
    let ws = null;
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          if (data.type === 'progress') {
            updateDownloadProgress(data.youtubeId, data.progress);
          } 
          // Handle the new dedicated completion event
          else if (data.type === 'download_completed') {
            // This is our new dedicated event that comes AFTER the video is in the database
            handleDownloadComplete(data.youtubeId, data.videoData);
            
            // Add this code to manually dispatch an event for refreshing the library
            const refreshEvent = new CustomEvent('tube-offline-download-completed');
            window.dispatchEvent(refreshEvent);
            window.downloadCompletedAt = Date.now();
            window.lastCompletedVideoId = data.youtubeId;
          } 
          else if (data.type === 'error') {
            handleDownloadError(data.youtubeId, data.error);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        // Start polling as fallback
        startPolling();
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        // Start polling as fallback
        startPolling();
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      // Start polling as fallback
      startPolling();
    }
    
    // Polling function as fallback for WebSocket
    let pollInterval = null;
    function startPolling() {
      if (pollInterval) return; // Don't start multiple polling intervals
      
      console.log('Starting polling for download updates');
      pollInterval = setInterval(() => {
        fetchActiveDownloads();
      }, 3000);
    }
    
    // Clean up WebSocket and polling on unmount
    return () => {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);
  
  const fetchActiveDownloads = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${DOWNLOAD_API}/active`);
      setActiveDownloads(response.data);
    } catch (err) {
      console.error('Failed to fetch active downloads:', err);
      error('Failed to fetch active downloads');
    } finally {
      setIsLoading(false);
    }
  }, [error]);
  
  const fetchDownloadHistory = useCallback(async (limit = 20, offset = 0) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${DOWNLOAD_API}/history`, {
        params: { limit, offset }
      });
      setDownloadHistory(response.data.downloads);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch download history:', err);
      error('Failed to fetch download history');
      return { downloads: [], pagination: { total: 0 } };
    } finally {
      setIsLoading(false);
    }
  }, [error]);
  
  /**
   * Start a video download
   * @param {FormData} formData FormData containing URL, quality, subtitles choice, and optional cookies file
   * @returns {Promise<boolean>} Success state
   */
  const startDownload = useCallback(async (formData) => {
    try {
      await axios.post(DOWNLOAD_API, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      success('Download started!');
      fetchActiveDownloads();
      return true;
    } catch (err) {
      console.error('Failed to start download:', err);
      
      // Check if the error is related to age restriction
      if (err.response?.data?.error && 
          (err.response.data.error.includes('age') || 
          err.response.data.error.includes('Sign in to confirm your age'))) {
        error('This video is age-restricted. Please provide YouTube cookies to download.');
        // The component will handle showing the cookie upload
        return false;
      } else if (err.response?.status === 409) {
        error('This video is already being downloaded');
      } else {
        error('Failed to start download');
      }
      return false;
    }
  }, [success, error, fetchActiveDownloads]);
  
  const cancelDownload = useCallback(async (youtubeId) => {
    try {
      await axios.delete(`${DOWNLOAD_API}/${youtubeId}`);
      
      // Update the local state immediately for better UX
      setActiveDownloads(prevDownloads => 
        prevDownloads.filter(download => download.youtube_id !== youtubeId)
      );
      
      success('Download cancelled');
      return true;
    } catch (err) {
      console.error('Failed to cancel download:', err);
      error('Failed to cancel download');
      return false;
    }
  }, [success, error]);
  
  const getVideoInfo = useCallback(async (url) => {
    try {
      const response = await axios.get(`${DOWNLOAD_API}/info`, {
        params: { url }
      });
      return response.data;
    } catch (err) {
      console.error('Failed to get video info:', err);
      
      // Check if the error is related to age restriction
      if (err.response?.data?.error && 
          (err.response.data.error.includes('age') || 
           err.response.data.error.includes('Sign in to confirm your age'))) {
        error('This video is age-restricted. Please provide YouTube cookies to download.');
        // Return an object that indicates age restriction
        return { isAgeRestricted: true };
      } else {
        error('Failed to fetch video information');
      }
      return null;
    }
  }, [error]);
  
  // Helper functions for handling WebSocket events
  const updateDownloadProgress = useCallback((youtubeId, progress) => {
    setActiveDownloads(prevDownloads => 
      prevDownloads.map(download => 
        download.youtube_id === youtubeId 
          ? { ...download, progress } 
          : download
      )
    );
  }, []);
  
  const handleDownloadComplete = useCallback((youtubeId, videoData) => {
    console.log('Download completed:', youtubeId, videoData);
    
    // Get download info from active downloads if videoData title not provided
    const downloadInfo = activeDownloads.find(d => d.youtube_id === youtubeId);
    const title = videoData?.title || downloadInfo?.title || 'Video';
    
    // Remove from active downloads
    setActiveDownloads(prevDownloads => 
      prevDownloads.filter(download => download.youtube_id !== youtubeId)
    );
    
    // Add to download history
    fetchDownloadHistory();
    
    // Show success notification
    success(`Download completed: ${title}`);
    
    // Now that we have confirmation the video is in the database,
    // refresh the library to show the new video
    try {
      // Use the global reference to refresh the library
      const libraryContext = window.libraryContext;
      if (libraryContext && typeof libraryContext.refreshLibrary === 'function') {
        console.log('Refreshing library after confirmed download completion');
        libraryContext.refreshLibrary();
      } else {
        console.log('Library context not available, falling back to event-based refresh');
        // Fallback to event-based refresh
        localStorage.setItem('downloadCompleted', Date.now().toString());
        const refreshEvent = new CustomEvent('refreshLibrary');
        window.dispatchEvent(refreshEvent);
      }
    } catch (err) {
      console.error('Error during library refresh:', err);
      // Fallback to event-based refresh
      localStorage.setItem('downloadCompleted', Date.now().toString());
      const refreshEvent = new CustomEvent('refreshLibrary');
      window.dispatchEvent(refreshEvent);
    }
  }, [success, fetchDownloadHistory, activeDownloads]);
  
  const handleDownloadError = useCallback((youtubeId, errorMessage) => {
    console.log('Download error received:', youtubeId, errorMessage);
    
    // Remove the failed download from active downloads
    setActiveDownloads(prevDownloads => 
      prevDownloads.filter(download => download.youtube_id !== youtubeId)
    );
    
    // Show error notification
    error(`Download failed: ${errorMessage}`);
    
    // Refresh download history to get updated failed downloads
    fetchDownloadHistory();
  }, [error, fetchDownloadHistory]);

  /**
   * Download a YouTube playlist
   * @param {FormData} formData FormData containing URL, quality, subtitles choice, playlist ID, and optional cookies file
   * @returns {Promise<Object|boolean>} Download result or false on error
   */
  const downloadPlaylist = useCallback(async (formData) => {
    try {
      const response = await axios.post(`${DOWNLOAD_API}/playlist`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      success(`Playlist download started: ${response.data.title || 'YouTube Playlist'}`);
      fetchActiveDownloads();
      return response.data;
    } catch (err) {
      console.error('Failed to start playlist download:', err);
      
      // Check if the error is related to age restriction
      if (err.response?.data?.error && 
          (err.response.data.error.includes('age') || 
           err.response.data.error.includes('Sign in to confirm your age'))) {
        error('This playlist contains age-restricted videos. Please provide YouTube cookies to download.');
        return false;
      } else if (err.response?.status === 409) {
        error('This playlist is already being downloaded');
      } else {
        error('Failed to start playlist download');
      }
      return false;
    }
  }, [success, error, fetchActiveDownloads]);
  
  const getPlaylistInfo = useCallback(async (url) => {
    try {
      const response = await axios.get(`${DOWNLOAD_API}/playlist-info`, {
        params: { url }
      });
      return response.data;
    } catch (err) {
      console.error('Failed to get playlist info:', err);
      
      // Check if the error is related to age restriction
      if (err.response?.data?.error && 
          (err.response.data.error.includes('age') || 
          err.response.data.error.includes('Sign in to confirm your age'))) {
        error('This video is age-restricted. Please provide YouTube cookies to download.');
        // The component will handle showing the cookie upload
        return false;
      } else if (err.response?.data?.error && 
                err.response.data.error.includes('Only images are available')) {
        error('This video cannot be downloaded. It may only contain images or no downloadable content.');
        return false;
      } else if (err.response?.data?.error && 
                err.response.data.error.includes('Requested format is not available')) {
        error('This video format is not available. Try a different quality setting.');
        return false;
      } else if (err.response?.status === 409) {
        error('This video is already being downloaded');
      } else {
        error('Failed to start download');
      }
      return null;
    }
  }, [error]);
  
  return (
    <DownloadContext.Provider
      value={{
        activeDownloads,
        downloadHistory,
        isLoading,
        isYtDlpInstalled,
        startDownload,
        downloadPlaylist,
        getPlaylistInfo,
        cancelDownload,
        getVideoInfo,
        fetchActiveDownloads,
        fetchDownloadHistory
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};