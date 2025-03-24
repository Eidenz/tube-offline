import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player';
import axios from 'axios'; // Add this import
import { 
  ArrowLeftIcon,
  HeartIcon,
  QueueListIcon,
  PlusIcon,
  TagIcon,
  UserIcon,
  ChevronDownIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useLibrary } from '../context/LibraryContext';
import { useNotification } from '../context/NotificationContext';
import VideoCard from '../components/video/VideoCard';

const VideoPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const playerRef = useRef(null);
  const [video, setVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFavoriteVideo, setIsFavoriteVideo] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [showDescription, setShowDescription] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  const { 
    fetchVideo, 
    recordVideoView, 
    videos, 
    isFavorite, 
    toggleFavorite, 
    playlists, 
    fetchPlaylists,
    addVideoToPlaylist,
    deleteVideo
  } = useLibrary();
  const { success, error } = useNotification();
  
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
    navigate(-1);
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
          <button
            className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full"
            onClick={goBack}
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Video Player - Central Piece */}
        <div className="w-full max-w-[90%] lg:max-w-[85%] xl:max-w-[80%] my-4">
          <div className="aspect-video w-full rounded-lg overflow-hidden shadow-2xl bg-secondary/30">
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
              <div className="text-sm text-text-secondary">
                {video.view_count && <span>{video.view_count} views</span>}
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