import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from './NotificationContext';
import axios from 'axios';

const API_URL = '/api';

const LibraryContext = createContext();

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

export const LibraryProvider = ({ children }) => {
  const [videos, setVideos] = useState([]);
  const [recentVideos, setRecentVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [tags, setTags] = useState([]);
  const [favoriteVideos, setFavoriteVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });
  
  const { success, error } = useNotification();
  const lastRefreshTimestamp = useRef(Date.now());
  const [allFavoriteIds, setAllFavoriteIds] = useState([]);

  const fetchAllFavoriteIds = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/favorites/ids`);
      if (response.data && response.data.favoriteIds) {
        setAllFavoriteIds(response.data.favoriteIds);
      }
      return response.data.favoriteIds || [];
    } catch (err) {
      console.error('Failed to fetch favorite IDs:', err);
      return [];
    }
  }, []);
  
  // Fetch videos with pagination
  const fetchVideos = useCallback(async (limit = 20, offset = 0) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/videos`, {
        params: { limit, offset }
      });
      
      if (offset === 0) {
        setVideos(response.data.videos);
      } else {
        setVideos(prevVideos => [...prevVideos, ...response.data.videos]);
      }
      
      setPagination(response.data.pagination);
      lastRefreshTimestamp.current = Date.now();
      return response.data;
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      error('Failed to fetch videos');
      return { videos: [], pagination: { total: 0 } };
    } finally {
      setIsLoading(false);
    }
  }, [error]);
  
  // Fetch a single video by ID
  const fetchVideo = useCallback(async (id) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/videos/${id}`);
      return response.data;
    } catch (err) {
      console.error(`Failed to fetch video with ID ${id}:`, err);
      //error('Failed to fetch video');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Record video view
  const recordVideoView = useCallback(async (id, duration = 0) => {
    try {
      await axios.post(`${API_URL}/videos/${id}/view`, { duration });
    } catch (err) {
      console.error('Failed to record video view:', err);
    }
  }, []);
  
  // Fetch recently viewed videos
  const fetchRecentVideos = useCallback(async (limit = 10) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/videos/history/recent`, {
        params: { limit }
      });
      setRecentVideos(response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch recent videos:', err);
      error('Failed to fetch recent videos');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  // Get favorites from API
  const getFavorites = useCallback(async (limit = 20, offset = 0) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/favorites`, {
        params: { limit, offset }
      });
      return response.data.videos;
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
      error('Failed to fetch favorites');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  // Check if a video is a favorite
  const isFavorite = useCallback((id) => {
    // First check if we have the ID in our local state
    if (allFavoriteIds.includes(parseInt(id)) || allFavoriteIds.includes(id)) {
      return Promise.resolve(true);
    }
    
    // If not found in local state, make the API call as fallback
    return axios.get(`${API_URL}/favorites/status/${id}`)
      .then(response => response.data.isFavorite)
      .catch(() => false);
  }, [allFavoriteIds]);

  // Toggle favorite status for a video
  const toggleFavorite = useCallback(async (id) => {
    try {
      // First check current status
      const isCurrentlyFavorite = allFavoriteIds.includes(parseInt(id)) || allFavoriteIds.includes(id);
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        await axios.delete(`${API_URL}/favorites/${id}`);
        // Update local state
        setAllFavoriteIds(prev => prev.filter(favId => 
          favId !== parseInt(id) && favId !== id
        ));
        success('Removed from favorites');
        return false;
      } else {
        // Add to favorites
        await axios.post(`${API_URL}/favorites/${id}`);
        // Update local state
        setAllFavoriteIds(prev => [...prev, parseInt(id)]);
        success('Added to favorites');
        return true;
      }
    } catch (err) {
      console.error('Failed to toggle favorite status:', err);
      error('Failed to update favorites');
      return null;
    }
  }, [allFavoriteIds, success, error]);

  // Add to favorites
  const addToFavorites = useCallback(async (id) => {
    try {
      await axios.post(`${API_URL}/favorites/${id}`);
      success('Added to favorites');
      return true;
    } catch (err) {
      console.error('Failed to add to favorites:', err);
      error('Failed to add to favorites');
      return false;
    }
  }, [success, error]);

  // Remove from favorites
  const removeFromFavorites = useCallback(async (id) => {
    try {
      await axios.delete(`${API_URL}/favorites/${id}`);
      success('Removed from favorites');
      return true;
    } catch (err) {
      console.error('Failed to remove from favorites:', err);
      error('Failed to remove from favorites');
      return false;
    }
  }, [success, error]);
  
  // Delete a video
  const deleteVideo = useCallback(async (id) => {
    try {
      await axios.delete(`${API_URL}/videos/${id}`);
      
      // Update the local state
      setVideos(prevVideos => prevVideos.filter(video => video.id !== id));
      setRecentVideos(prevVideos => prevVideos.filter(video => video.id !== id));
      setFavoriteVideos(prevFavorites => prevFavorites.filter(videoId => videoId !== id));
      
      success('Video deleted successfully');
      return true;
    } catch (err) {
      console.error('Failed to delete video:', err);
      error('Failed to delete video');
      
      // Mark the error as handled
      const handledError = new Error('handled');
      throw handledError;
    }
  }, [success, error]);
  
  // Fetch all playlists
  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/playlists`);
      setPlaylists(response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch playlists:', err);
      error('Failed to fetch playlists');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [error]);
  
  // Fetch a single playlist with videos
  const fetchPlaylist = useCallback(async (id) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/playlists/${id}`);
      return response.data;
    } catch (err) {
      console.error(`Failed to fetch playlist with ID ${id}:`, err);
      error('Failed to fetch playlist');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [error]);
  
  // Create a new playlist
  const createPlaylist = useCallback(async (name, description = '', thumbnailId = null) => {
    try {
      const response = await axios.post(`${API_URL}/playlists`, {
        name,
        description,
        thumbnail_id: thumbnailId // Send thumbnail_id to server
      });
      
      const newPlaylist = response.data;
      
      // Update the local state
      setPlaylists(prevPlaylists => [...prevPlaylists, newPlaylist]);
      
      success('Playlist created successfully');
      return newPlaylist;
    } catch (err) {
      console.error('Failed to create playlist:', err);
      error('Failed to create playlist');
      return null;
    }
  }, [success, error]);
  
  // Update a playlist
  const updatePlaylist = useCallback(async (id, updates, thumbnailId = null) => {
    try {
      const response = await axios.put(`${API_URL}/playlists/${id}`, {
        name: updates.name,
        description: updates.description,
        thumbnail_id: thumbnailId // Send thumbnail_id to server
      });
      
      // After update, fetch the complete playlist with thumbnail_url
      // This ensures we have the latest data including the thumbnail URL
      const updatedPlaylistResponse = await axios.get(`${API_URL}/playlists/${id}`);
      const completePlaylist = updatedPlaylistResponse.data;
      
      // Update the local state with complete data including thumbnail
      setPlaylists(prevPlaylists => 
        prevPlaylists.map(playlist => 
          playlist.id === id ? completePlaylist : playlist
        )
      );
      
      success('Playlist updated successfully');
      return completePlaylist;
    } catch (err) {
      console.error('Failed to update playlist:', err);
      error('Failed to update playlist');
      return null;
    }
  }, [success, error]);
  
  // Get playlist thumbnail
  const getPlaylistThumbnail = useCallback((playlistId) => {
    // Find the playlist in our local state
    const playlist = playlists.find(p => p.id === playlistId);
    
    // Return the thumbnail_url if available
    if (playlist && playlist.thumbnail_url) {
      return playlist.thumbnail_url;
    }
    
    return null;
  }, [playlists]);
  
  // Delete a playlist
  const deletePlaylist = useCallback(async (id) => {
    try {
      await axios.delete(`${API_URL}/playlists/${id}`);
      
      // Remove thumbnail from localStorage
      const playlistThumbnails = JSON.parse(localStorage.getItem('playlistThumbnails') || '{}');
      delete playlistThumbnails[id];
      localStorage.setItem('playlistThumbnails', JSON.stringify(playlistThumbnails));
      
      // Update the local state
      setPlaylists(prevPlaylists => prevPlaylists.filter(playlist => playlist.id !== id));
      
      success('Playlist deleted successfully');
      return true;
    } catch (err) {
      console.error('Failed to delete playlist:', err);
      error('Failed to delete playlist');
      return false;
    }
  }, [success, error]);
  
  // Add a video to a playlist
  const addVideoToPlaylist = useCallback(async (playlistId, videoId) => {
    try {
      const response = await axios.post(`${API_URL}/playlists/${playlistId}/videos`, {
        videoId
      });
      
      // Get current playlist to check if it needs a thumbnail
      const playlist = playlists.find(p => p.id === playlistId);
      
      // If the playlist doesn't have a thumbnail_id, update it with this video
      if (playlist && !playlist.thumbnail_id) {
        // Get video info
        const videoInfo = videos.find(v => v.id === videoId);
        
        if (videoInfo) {
          // Update the playlist with this video as thumbnail
          await updatePlaylist(playlistId, {
            name: playlist.name,
            description: playlist.description
          }, videoId);
        }
      }
      
      success('Video added to playlist');
      return response.data;
    } catch (err) {
      console.error('Failed to add video to playlist:', err);
      error('Failed to add video to playlist');
      
      // Mark the error as handled
      const handledError = new Error('handled');
      throw handledError;
    }
  }, [playlists, videos, updatePlaylist, success, error]);
  
  // Remove a video from a playlist
  const removeVideoFromPlaylist = useCallback(async (playlistId, videoId) => {
    try {
      await axios.delete(`${API_URL}/playlists/${playlistId}/videos/${videoId}`);
      
      success('Video removed from playlist');
      return true;
    } catch (err) {
      console.error('Failed to remove video from playlist:', err);
      error('Failed to remove video from playlist');
      return false;
    }
  }, [success, error]);
  
  // Reorder videos in a playlist
  const reorderPlaylistVideos = useCallback(async (playlistId, videoIds) => {
    try {
      await axios.put(`${API_URL}/playlists/${playlistId}/reorder`, {
        videoIds
      });
      
      success('Playlist order updated');
      return true;
    } catch (err) {
      console.error('Failed to reorder playlist videos:', err);
      error('Failed to reorder playlist');
      return false;
    }
  }, [success, error]);
  
  // Search videos
  const searchVideos = useCallback(async (query, type = 'all', limit = 20, offset = 0) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/search`, {
        params: { query, type, limit, offset }
      });
      
      return response.data;
    } catch (err) {
      console.error('Search failed:', err);
      error('Search failed');
      return { videos: [], pagination: { total: 0 } };
    } finally {
      setIsLoading(false);
    }
  }, [error]);
  
  // Fetch all tags
  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/search/tags`);
      setTags(response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      error('Failed to fetch tags');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [error]);
  
  // Refresh library data - utility function to refresh everything
  const refreshLibrary = useCallback(() => {
    console.log('Refreshing library data');
    // Remove the time check to ensure immediate refresh
    fetchVideos();
    fetchRecentVideos();
    lastRefreshTimestamp.current = Date.now();
  }, [fetchVideos, fetchRecentVideos]);

  const getTopTags = useCallback(async (limit = 10) => {
    try {
      const response = await axios.get(`${API_URL}/search/tags/top`, {
        params: { limit }
      });
      return response.data;
    } catch (err) {
      console.error('Failed to fetch top tags:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    const refreshVideoDownloadHandler = () => {
      console.log('Download completion event detected, refreshing library');
      refreshLibrary();
    };
    
    // Listen for download completion via custom event
    window.addEventListener('tube-offline-download-completed', refreshVideoDownloadHandler);
    
    // Set up a periodic check for the global variables that are set by the server
    const periodicCheck = setInterval(() => {
      if (window.downloadCompletedAt && 
          window.lastCompletedAt !== window.downloadCompletedAt) {
        console.log('Download completion detected via global variables, refreshing library');
        refreshLibrary();
        window.lastCompletedAt = window.downloadCompletedAt;
      }
    }, 2000); // Check every 2 seconds
    
    return () => {
      window.removeEventListener('tube-offline-download-completed', refreshVideoDownloadHandler);
      clearInterval(periodicCheck);
    };
  }, [refreshLibrary]);
  
  // Load initial data
  useEffect(() => {
    fetchVideos();
    fetchRecentVideos();
    fetchPlaylists();
    fetchTags();
    fetchAllFavoriteIds();
    
    // Load favorites from localStorage
    try {
      const savedFavorites = localStorage.getItem('favoriteVideos');
      if (savedFavorites) {
        setFavoriteVideos(JSON.parse(savedFavorites));
      }
    } catch (err) {
      console.error('Failed to load favorites from localStorage:', err);
      // Initialize with empty array if there's an error
      setFavoriteVideos([]);
    }
    
    // Listen for download completions via localStorage (for cross-tab communication)
    const handleStorageChange = (e) => {
      if (e.key === 'downloadCompleted') {
        console.log('Download completion detected via storage event, refreshing videos');
        refreshLibrary();
      }
    };
    
    // Listen for download completions via custom event (same tab/window)
    const handleRefreshEvent = () => {
      console.log('Download completion detected via custom event, refreshing videos');
      refreshLibrary();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('refreshLibrary', handleRefreshEvent);
    
    // Also check on load in case a download completed in another tab
    const lastDownloadCompleted = localStorage.getItem('downloadCompleted');
    if (lastDownloadCompleted) {
      // Clear the item to avoid double refreshes
      localStorage.removeItem('downloadCompleted');
      refreshLibrary();
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('refreshLibrary', handleRefreshEvent);
    };
  }, [fetchVideos, fetchRecentVideos, fetchPlaylists, fetchTags, fetchAllFavoriteIds, refreshLibrary]);
  
  return (
    <LibraryContext.Provider
      value={{
        videos,
        recentVideos,
        playlists,
        tags,
        isLoading,
        pagination,
        isFavorite,
        toggleFavorite,
        getFavorites,
        addToFavorites,
        removeFromFavorites,
        fetchVideos,
        fetchVideo,
        recordVideoView,
        fetchRecentVideos,
        deleteVideo,
        fetchPlaylists,
        fetchPlaylist,
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        addVideoToPlaylist,
        removeVideoFromPlaylist,
        reorderPlaylistVideos,
        searchVideos,
        fetchTags,
        getTopTags,
        getPlaylistThumbnail,
        refreshLibrary,
        allFavoriteIds,
        fetchAllFavoriteIds,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};