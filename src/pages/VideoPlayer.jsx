import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player';
import axios from 'axios';
import { 
  ArrowLeftIcon,
  HeartIcon,
  QueueListIcon,
  PlusIcon,
  TagIcon,
  UserIcon,
  ChevronDownIcon,
  XMarkIcon,
  TrashIcon,
  PlayIcon,
  ForwardIcon,
  BackwardIcon,
  ChevronUpIcon,
  ChevronDoubleUpIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, PlayIcon as PlayIconSolid } from '@heroicons/react/24/solid';
import { useLibrary } from '../context/LibraryContext';
import { useNotification } from '../context/NotificationContext';
import VideoCard from '../components/video/VideoCard';
import VideoQualityBadge from '../components/video/VideoQualityBadge';

const YouTubeIcon = () => (
  <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
  </svg>
);

// Initialize volume from localStorage or use default (0.8)
const getSavedVolume = () => {
  try {
    const savedVolume = localStorage.getItem('videoPlayerVolume');
    if (savedVolume !== null) {
      const parsedVolume = parseFloat(savedVolume);
      // Ensure volume is a valid number between 0 and 1
      if (!isNaN(parsedVolume) && isFinite(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1) {
        return parsedVolume;
      }
    }
    return 0.8; // Default volume if not saved or invalid
  } catch (err) {
    console.error('Error reading saved volume:', err);
    return 0.8;
  }
};

const VideoPlayer = () => {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerRef = useRef(null);
  const [video, setVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(getSavedVolume());
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFavoriteVideo, setIsFavoriteVideo] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [showDescription, setShowDescription] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Playlist related states
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  const [playlistVideos, setPlaylistVideos] = useState([]);
  const [isPlaylistCollapsed, setIsPlaylistCollapsed] = useState(false);
  
  const { 
    fetchVideo, 
    recordVideoView, 
    videos, 
    isFavorite, 
    toggleFavorite, 
    playlists, 
    fetchPlaylists,
    addVideoToPlaylist,
    deleteVideo,
    fetchPlaylist
  } = useLibrary();
  const { success, error } = useNotification();

  // Handle volume changes and save to localStorage
  const handleVolumeChange = useCallback((event) => {
    try {
      // Don't use any event handlers for volume
      // Instead, use a mute/unmute button or custom volume control if needed
      
      // If you need to save the volume when user changes it manually,
      // you can listen for the video's volumechange event using a ref:
      if (playerRef.current) {
        const mediaElement = playerRef.current.getInternalPlayer();
        if (mediaElement && typeof mediaElement.volume === 'number') {
          const safeVolume = Math.min(Math.max(0, mediaElement.volume), 1);
          localStorage.setItem('videoPlayerVolume', safeVolume.toString());
        }
      }
    } catch (err) {
      console.error('Error handling volume change:', err);
    }
  }, []);

  // Effect to check if there's a playlist in the URL or session storage
  useEffect(() => {
    const playlistId = searchParams.get('playlist');
    const indexParam = searchParams.get('index');
    const fromPlaylist = searchParams.get('fromPlaylist') === 'true';
    
    if (playlistId && indexParam !== null && fromPlaylist) {
      // Only proceed if we came from the playlist page
      const index = parseInt(indexParam, 10);
      
      // Try to get the playlist from session storage first
      let playlistData = null;
      try {
        const storedPlaylist = sessionStorage.getItem('currentPlaylist');
        if (storedPlaylist) {
          playlistData = JSON.parse(storedPlaylist);
        }
      } catch (err) {
        console.error('Error reading playlist from session storage:', err);
      }
  
      // If we have playlist data from session storage and it matches the ID
      if (playlistData && playlistData.id === playlistId) {
        setCurrentPlaylist(playlistData);
        setPlaylistIndex(index);
      } else {
        // Otherwise, fetch the playlist from the API
        fetchPlaylist(playlistId)
          .then(data => {
            if (data) {
              const playlistForStorage = {
                id: data.id,
                name: data.name,
                videos: data.videos.map(v => ({ id: v.id, title: v.title, thumbnail_url: v.thumbnail_url, duration_formatted: v.duration_formatted }))
              };
              
              // Save to session storage for future use
              sessionStorage.setItem('currentPlaylist', JSON.stringify(playlistForStorage));
              
              setCurrentPlaylist(playlistForStorage);
              setPlaylistIndex(index);
              setPlaylistVideos(data.videos || []);
            }
          })
          .catch(err => {
            console.error('Error fetching playlist:', err);
            // Don't show an error to the user, just continue as normal video
          });
      }
    } else {
      // No playlist in URL or not from playlist page, clear playlist data
      setCurrentPlaylist(null);
      setPlaylistIndex(-1);
      setPlaylistVideos([]);
    }
  }, [id, searchParams, fetchPlaylist]);

  const getYoutubeUrl = () => {
    if (!video || !video.youtube_id) return null;
    return `https://www.youtube.com/watch?v=${video.youtube_id}`;
  };
  
  // Fetch video data
  useEffect(() => {
    const getVideo = async () => {
      setIsLoading(true);
      try {
        const videoData = await fetchVideo(id);
        if (videoData) {
          setVideo(videoData);
          // Simulate fetch of related videos (in a real app, this would be based on tags or categories)
          const related = videos.filter(v => v.id !== videoData.id).slice(0, 6);
          setRelatedVideos(related);
        } else {
          //error('Video not found');
          navigate('/');
        }
      } catch (err) {
        console.error('Error fetching video:', err);
        error('Failed to load video');
      } finally {
        setIsLoading(false);
      }
    };
    
    getVideo();
    fetchPlaylists();
  }, [id, fetchVideo, navigate, error, videos, fetchPlaylists]);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (video?.id) {
        const status = await isFavorite(video.id);
        setIsFavoriteVideo(status);
      }
    };
    
    checkFavoriteStatus();
  }, [video, isFavorite]);
  
  // Record view when the video starts playing
  const handleVideoStart = () => {
    if (video?.id) {
      recordVideoView(video.id);
    }
  };
  
  // Handle video progress
  const handleProgress = (state) => {
    setProgress(state.played);
  };
  
  // Handle video duration when available
  const handleDuration = (duration) => {
    setDuration(duration);
  };

  // Handle video end - go to next video if in playlist
  const handleVideoEnd = () => {
    if (currentPlaylist && playlistIndex !== -1 && playlistIndex < currentPlaylist.videos.length - 1) {
      handleNextVideo();
    }
  };
  
  // Format time in seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Toggle favorite status
  const handleToggleFavorite = async () => {
    if (!video) return;
    
    try {
      // Use the addToFavorites/removeFromFavorites functions directly instead of toggleFavorite
      // This prevents the success toast from being shown twice
      if (isFavoriteVideo) {
        // Remove from favorites without showing toast in the function
        await axios.delete(`/api/favorites/${video.id}`);
        setIsFavoriteVideo(false);
        // Show toast here instead
        success('Removed from favorites');
      } else {
        // Add to favorites without showing toast in the function
        await axios.post(`/api/favorites/${video.id}`);
        setIsFavoriteVideo(true);
        // Show toast here instead
        success('Added to favorites');
      }
    } catch (err) {
      console.error('Failed to toggle favorite status:', err);
      error('Failed to update favorites');
    }
  };
  
  // Add to playlist (would show a modal in a real app)
  const handleAddToPlaylist = () => {
    setShowPlaylistModal(true);
  };
  
  // Add the current video to the selected playlist
  const handleAddToSelectedPlaylist = async () => {
    if (!selectedPlaylistId || !video) return;
    
    try {
      await addVideoToPlaylist(selectedPlaylistId, video.id);
      // Success toast is already shown in LibraryContext
      setShowPlaylistModal(false);
      setSelectedPlaylistId(null);
    } catch (err) {
      // Only show error if not already handled
      if (err.message !== 'handled') {
        error('Failed to add video to playlist');
      }
    }
  };
  
  // Go back to previous page
  const goBack = () => {
    // If we're in a playlist and not from the playlist page, go back to the playlist page
    if (currentPlaylist && !searchParams.get('playlist')) {
      navigate(`/playlist/${currentPlaylist.id}`);
    } else {
      navigate(-1);
    }
  };
  
  // Toggle description expansion
  const toggleDescription = () => {
    setShowDescription(!showDescription);
  };
  
  // Handle video deletion
  const handleDeleteVideo = async () => {
    if (!video) return;
    
    try {
      // Close the modal immediately to prevent more renders
      setIsDeleteConfirmOpen(false);
      
      // Perform the delete operation
      const result = await deleteVideo(video.id);
      if (result) {
        // Navigate away immediately with replace to prevent back navigation
        navigate('/', { replace: true });
        return;
      }
    } catch (err) {
      // Only show error if not already handled
      if (err.message !== 'handled') {
        error('Failed to delete video');
      }
    }
  };

  // Navigate to previous video in the playlist
  const handlePreviousVideo = () => {
    if (!currentPlaylist || playlistIndex <= 0) return;
    
    const prevIndex = playlistIndex - 1;
    const prevVideoId = currentPlaylist.videos[prevIndex].id;
    
    // Navigate to the previous video, maintaining the fromPlaylist flag
    navigate(`/video/${prevVideoId}?playlist=${currentPlaylist.id}&index=${prevIndex}&fromPlaylist=true`);
  };

  // Navigate to next video in the playlist
  const handleNextVideo = () => {
    if (!currentPlaylist || playlistIndex >= currentPlaylist.videos.length - 1) return;
    
    const nextIndex = playlistIndex + 1;
    const nextVideoId = currentPlaylist.videos[nextIndex].id;
    
    // Navigate to the next video, maintaining the fromPlaylist flag
    navigate(`/video/${nextVideoId}?playlist=${currentPlaylist.id}&index=${nextIndex}&fromPlaylist=true`);
  };

  // Toggle playlist collapsed state
  const togglePlaylistCollapsed = () => {
    setIsPlaylistCollapsed(!isPlaylistCollapsed);
  };

  useEffect(() => {
    // Set up volume change listener after the player is mounted
    const setupVolumeListener = () => {
      try {
        if (playerRef.current) {
          const mediaElement = playerRef.current.getInternalPlayer();
          if (mediaElement) {
            const volumeChangeHandler = () => {
              try {
                const currentVolume = mediaElement.volume;
                // Ensure volume is a valid number
                if (typeof currentVolume === 'number' && 
                    !isNaN(currentVolume) && 
                    isFinite(currentVolume) && 
                    currentVolume >= 0 && 
                    currentVolume <= 1) {
                  setVolume(currentVolume);
                  localStorage.setItem('videoPlayerVolume', currentVolume.toString());
                }
              } catch (err) {
                console.error('Error in volume change handler:', err);
              }
            };
            
            // Add the event listener
            mediaElement.addEventListener('volumechange', volumeChangeHandler);
            
            // Return cleanup function
            return () => {
              mediaElement.removeEventListener('volumechange', volumeChangeHandler);
            };
          }
        }
      } catch (err) {
        console.error('Error setting up volume listener:', err);
      }
      return () => {}; // Empty cleanup if setup fails
    };
    
    // Small delay to ensure player is initialized
    const timeoutId = setTimeout(setupVolumeListener, 1000);
    return () => clearTimeout(timeoutId);
  }, [video]);
  
  // Page animation
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0 }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }
  
  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-text-secondary">
        <h2 className="text-2xl font-bold mb-4">Video not found</h2>
        <button
          className="btn btn-primary"
          onClick={goBack}
        >
          Go Back
        </button>
      </div>
    );
  }
  
  return (
    <motion.div
      className="w-full"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Main container with back button and central video */}
      <div className="w-full flex flex-col items-center">
        {/* Back button - positioned in a max-width container */}
        <div className="w-full max-w-[90%] lg:max-w-[85%] xl:max-w-[80%] px-4 pt-4">
          <div className="flex items-center justify-between">
            <button
              className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full"
              onClick={goBack}
              aria-label="Go back"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            
            {/* Playlist info if applicable */}
            {currentPlaylist && (
              <div className="flex items-center gap-2">
                <QueueListIcon className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">
                  {currentPlaylist.name} ({playlistIndex + 1}/{currentPlaylist.videos.length})
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Video Player - Central Piece */}
        <div className="w-full max-w-[90%] lg:max-w-[85%] xl:max-w-[80%] my-4">
          <div className="aspect-video w-full rounded-lg overflow-hidden shadow-2xl bg-secondary/30 relative">
            <ReactPlayer
              ref={playerRef}
              url={video.video_url}
              width="100%"
              height="100%"
              playing={playing}
              volume={volume}
              onStart={handleVideoStart}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onEnded={handleVideoEnd}
              config={{
                file: {
                  tracks: video.subtitle_url ? [
                    {
                      kind: 'subtitles',
                      src: video.subtitle_url,
                      srcLang: 'en',
                      default: true,
                      label: 'English'
                    }
                  ] : []
                }
              }}
              controls
            />
          </div>
        </div>
      </div>
      
      {/* Playlist Section */}
      {currentPlaylist && playlistVideos.length > 0 && (
        <div className="w-full max-w-[90%] lg:max-w-[85%] xl:max-w-[80%] mx-auto px-4 mb-6">
          <div className="bg-secondary/30 rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={togglePlaylistCollapsed}
            >
              <div className="flex items-center gap-2">
                <QueueListIcon className="w-5 h-5 text-accent" />
                <h3 className="font-medium">
                  {currentPlaylist.name} • {playlistVideos.length} videos
                </h3>
              </div>
              <button className="text-text-secondary hover:text-text-primary">
                {isPlaylistCollapsed ? (
                  <ChevronDownIcon className="w-5 h-5" />
                ) : (
                  <ChevronUpIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {!isPlaylistCollapsed && (
              <div className="max-h-80 overflow-y-auto p-2">
                {playlistVideos.map((playlistVideo, index) => (
                  <div 
                    key={playlistVideo.id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      playlistVideo.id.toString() === id.toString() 
                        ? 'bg-accent/20 text-accent' 
                        : 'hover:bg-secondary/50'
                    } transition-colors cursor-pointer mb-2`}
                    onClick={() => navigate(`/video/${playlistVideo.id}?playlist=${currentPlaylist.id}&index=${index}&fromPlaylist=true`)}
                  >
                    <div className="relative w-24 h-14 flex-shrink-0">
                      <img 
                        src={playlistVideo.thumbnail_url || '/placeholder-thumbnail.jpg'} 
                        alt={playlistVideo.title}
                        className="w-full h-full object-cover rounded"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                        {playlistVideo.duration_formatted}
                      </div>
                      {playlistVideo.id.toString() === id.toString() && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                          <PlayIconSolid className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{playlistVideo.title}</h4>
                      <p className="text-xs text-text-secondary truncate">{playlistVideo.channel}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Video Info Section */}
      <div className="w-full max-w-[90%] lg:max-w-[85%] xl:max-w-[80%] mx-auto px-4 pt-6 pb-16">
        {/* Video Title and Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <motion.h1 
            className="text-3xl font-bold"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {video.title}
          </motion.h1>
          
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.button
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-secondary transition-all"
              onClick={handleToggleFavorite}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isFavoriteVideo ? (
                <HeartIconSolid className="w-6 h-6 text-red-500" />
              ) : (
                <HeartIcon className="w-6 h-6" />
              )}
              <span className="text-xs text-text-secondary">Favorite</span>
            </motion.button>
            
            {/* Add the YouTube Link button here */}
            <motion.a
              href={getYoutubeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-secondary transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <YouTubeIcon />
              <span className="text-xs text-text-secondary">YouTube</span>
            </motion.a>
            
            <motion.button
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-secondary transition-all"
              onClick={handleAddToPlaylist}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <QueueListIcon className="w-6 h-6" />
              <span className="text-xs text-text-secondary">Playlist</span>
            </motion.button>
            
            <motion.button
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-secondary transition-all text-red-500 hover:text-red-600"
              onClick={() => setIsDeleteConfirmOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <TrashIcon className="w-6 h-6" />
              <span className="text-xs">Delete</span>
            </motion.button>
          </motion.div>
        </div>
        
        {/* Channel and Stats Row */}
        <motion.div 
          className="flex items-center justify-between mb-6 pb-6 border-b border-[#3f3f3f]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary/80 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-text-secondary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">{video.channel}</h3>
              <div className="flex flex-wrap gap-2 text-sm text-text-secondary">
                {video.view_count && <span>{video.view_count} views</span>}
                {video.metadata && (
                  <>
                    {video.view_count && <span className="text-text-secondary/50">•</span>}
                    <VideoQualityBadge metadata={video.metadata} />
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Video Description */}
        {video.description && (
          <motion.div 
            className="mb-8 bg-secondary/20 rounded-xl p-5 overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-medium">Description</h3>
              <button 
                onClick={toggleDescription}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                <motion.div
                  animate={{ rotate: showDescription ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDownIcon className="w-5 h-5" />
                </motion.div>
              </button>
            </div>
            
            <div 
              className={`text-text-secondary transition-all duration-300 overflow-hidden ${
                showDescription ? 'max-h-[500px]' : 'max-h-24'
              }`}
            >
              <p className="whitespace-pre-line">
                {video.description}
              </p>
            </div>
          </motion.div>
        )}
        
        {/* Tags Cloud */}
        {video.tags && video.tags.length > 0 && (
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <TagIcon className="w-5 h-5 text-accent" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {video.tags.map((tag, index) => (
                <motion.span
                  key={index}
                  className="bg-secondary px-3 py-1.5 rounded-full text-sm text-text-secondary hover:bg-accent hover:text-text-primary cursor-pointer transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {tag.name}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Related Videos */}
        {relatedVideos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <QueueListIcon className="w-6 h-6 text-accent" />
              Related Videos
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedVideos.map((relatedVideo, index) => (
                <motion.div
                  key={relatedVideo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                >
                  <VideoCard video={relatedVideo} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Add to Playlist Modal */}
      <AnimatePresence>
        {showPlaylistModal && (
          <motion.div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPlaylistModal(false)}
          >
            <motion.div 
              className="bg-secondary rounded-xl w-full max-w-md overflow-hidden"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-[#3f3f3f]">
                <h3 className="text-xl font-semibold">Add to Playlist</h3>
                <button 
                  onClick={() => setShowPlaylistModal(false)}
                  className="p-1 rounded-full hover:bg-primary/30 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-4 max-h-96 overflow-y-auto">
                <Link to="/playlists" className="flex items-center gap-3 w-full p-4 mb-4 bg-primary/30 rounded-lg hover:bg-primary/50 transition-colors text-left">
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                    <PlusIcon className="w-5 h-5 text-accent" />
                  </div>
                  <span>Create new playlist</span>
                </Link>
                
                <div className="h-px bg-[#3f3f3f] my-4"></div>
                
                <div className="space-y-2">
                  {playlists.length > 0 ? (
                    playlists.map((playlist) => (
                      <motion.button 
                        key={playlist.id}
                        className={`flex items-center gap-3 w-full p-3 rounded-lg hover:bg-hover transition-colors text-left ${
                          selectedPlaylistId === playlist.id ? 'bg-accent/10 text-accent' : ''
                        }`}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPlaylistId(playlist.id)}
                      >
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                          <QueueListIcon className="w-4 h-4" />
                        </div>
                        <span>{playlist.name}</span>
                      </motion.button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-text-secondary">
                      No playlists found. Create one to add videos.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-[#3f3f3f] p-4 flex justify-end gap-2">
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowPlaylistModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddToSelectedPlaylist}
                  disabled={!selectedPlaylistId}
                >
                  Add to Playlist
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <motion.div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDeleteConfirmOpen(false)}
          >
            <motion.div 
              className="bg-secondary rounded-xl w-full max-w-md overflow-hidden"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <TrashIcon className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Delete Video</h3>
                    <p className="text-text-secondary text-sm">
                      Are you sure you want to delete "{video.title}"?
                    </p>
                  </div>
                </div>
                
                <p className="text-text-secondary mb-6">
                  This action cannot be undone. The video will be permanently removed from your library.
                </p>
                
                <div className="flex justify-end gap-3">
                  <button
                    className="btn btn-outline"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn bg-red-600 hover:bg-red-700 text-white border-none"
                    onClick={handleDeleteVideo}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VideoPlayer;