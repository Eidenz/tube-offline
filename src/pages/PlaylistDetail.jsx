import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  QueueListIcon, 
  ArrowLeftIcon, 
  PlayIcon, 
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useLibrary } from '../context/LibraryContext';
import { useNotification } from '../context/NotificationContext';
import VideoCard from '../components/video/VideoCard';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const { fetchPlaylist, reorderPlaylistVideos, removeVideoFromPlaylist } = useLibrary();
  const { success, error } = useNotification();
  
  // Fetch playlist data
  useEffect(() => {
    const getPlaylist = async () => {
      setIsLoading(true);
      try {
        const data = await fetchPlaylist(id);
        if (data) {
          setPlaylist(data);
          setVideos(data.videos || []);
        } else {
          error('Playlist not found');
          navigate('/playlists');
        }
      } catch (err) {
        console.error('Failed to fetch playlist:', err);
        error('Failed to load playlist');
      } finally {
        setIsLoading(false);
      }
    };
    
    getPlaylist();
  }, [id, fetchPlaylist, navigate, error]);
  
  // Handle reordering videos in the playlist
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(videos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update local state immediately for better UX
    setVideos(items);
    
    // Get the video IDs in the new order
    const videoIds = items.map(video => video.id);
    
    // Make the API call to update the order
    try {
      await reorderPlaylistVideos(playlist.id, videoIds);
    } catch (err) {
      console.error('Failed to reorder playlist:', err);
      
      // If the API call fails, revert back to the original order
      const data = await fetchPlaylist(id);
      if (data) {
        setVideos(data.videos || []);
      }
    }
  };
  
  // Remove a video from the playlist
  const handleRemoveVideo = async (videoId) => {
    try {
      const result = await removeVideoFromPlaylist(playlist.id, videoId);
      
      if (result) {
        // Update local state
        setVideos(videos.filter(video => video.id !== videoId));
        setPlaylist({
          ...playlist,
          video_count: playlist.video_count - 1
        });
        success('Video removed from playlist');
      }
    } catch (err) {
      console.error('Failed to remove video from playlist:', err);
      error('Failed to remove video');
    }
  };
  
  // Start playing the playlist from the first video
  const handlePlayAll = () => {
    if (videos.length > 0) {
      // Store playlist data in sessionStorage for the video player to access
      sessionStorage.setItem('currentPlaylist', JSON.stringify({
        id: playlist.id,
        name: playlist.name,
        videos: videos.map(v => ({ id: v.id, title: v.title }))
      }));
      
      // Navigate to the first video, adding the fromPlaylist flag
      navigate(`/video/${videos[0].id}?playlist=${playlist.id}&index=0&fromPlaylist=true`);
    }
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };
  
  // Go back to playlists page
  const goBack = () => {
    navigate('/playlists');
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
  
  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-text-secondary">
        <h2 className="text-2xl font-bold mb-4">Playlist not found</h2>
        <button
          className="btn btn-primary"
          onClick={goBack}
        >
          Go Back to Playlists
        </button>
      </div>
    );
  }
  
  return (
    <motion.div
      className="container mx-auto px-6 pt-6 pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="mb-8">
        <button
          className="text-text-secondary hover:text-text-primary transition-colors mb-4"
          onClick={goBack}
          aria-label="Go back"
        >
          <div className="flex items-center gap-1">
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Playlists</span>
          </div>
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            {/* Show thumbnail if available */}
            {playlist.thumbnail_url ? (
              <img 
                src={playlist.thumbnail_url} 
                alt={playlist.name}
                className="w-12 h-12 object-cover rounded-lg"
              />
            ) : (
              <QueueListIcon className="w-12 h-12 text-accent" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{playlist.name}</h1>
              <p className="text-text-secondary text-sm">
                {playlist.video_count} {playlist.video_count === 1 ? 'video' : 'videos'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {videos.length > 0 && (
              <motion.button
                className="btn btn-primary flex items-center gap-2"
                onClick={handlePlayAll}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PlayIcon className="w-5 h-5" />
                Play All
              </motion.button>
            )}
            <button
              className={`btn ${isEditMode ? 'btn-accent' : 'btn-outline'}`}
              onClick={toggleEditMode}
            >
              {isEditMode ? 'Done' : 'Edit Playlist'}
            </button>
          </div>
        </div>
        
        {playlist.description && (
          <p className="text-text-secondary mt-4 max-w-3xl">
            {playlist.description}
          </p>
        )}
      </div>
      
      {videos.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="playlist-videos" isDropDisabled={!isEditMode}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {videos.map((video, index) => (
                  <Draggable 
                    key={video.id} 
                    draggableId={`video-${video.id}`} 
                    index={index}
                    isDragDisabled={!isEditMode}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-secondary rounded-lg overflow-hidden transition-shadow ${
                          snapshot.isDragging ? 'shadow-xl' : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row">
                          {/* For mobile view, just show the video card */}
                          <div className="sm:hidden">
                            <VideoCard video={video} />
                          </div>
                          
                          {/* For larger screens, custom layout */}
                          <div className="hidden sm:block sm:flex-shrink-0 w-48">
                            <div className="relative h-full">
                              <img
                                src={video.thumbnail_url || '/placeholder-thumbnail.jpg'}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-2 right-2 bg-black/80 text-text-primary px-1.5 py-0.5 rounded text-xs">
                                {video.duration_formatted}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1 hidden sm:flex items-center p-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium mb-1 line-clamp-1">{video.title}</h3>
                              <p className="text-sm text-text-secondary">{video.channel}</p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {isEditMode ? (
                                <>
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-move bg-hover p-2 rounded"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  
                                  <button
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                    onClick={() => handleRemoveVideo(video.id)}
                                    aria-label="Remove from playlist"
                                  >
                                    <TrashIcon className="w-5 h-5" />
                                  </button>
                                </>
                              ) : (
                                <Link
                                  to={`/video/${video.id}?playlist=${playlist.id}&index=${index}&fromPlaylist=true`}
                                  className="p-2 text-accent hover:bg-accent/10 rounded transition-colors"
                                  aria-label="Play video"
                                >
                                  <PlayIcon className="w-5 h-5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary bg-secondary/30 rounded-lg">
          <QueueListIcon className="w-16 h-16 mb-4 opacity-30" />
          <h3 className="text-xl font-medium mb-2">This playlist is empty</h3>
          <p className="text-center max-w-md mb-6">
            Add videos to this playlist to start watching
          </p>
          <Link
            to="/"
            className="btn btn-primary flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Browse Videos
          </Link>
        </div>
      )}
      
      {/* Edit Playlist Info Button */}
      {!isEditMode && (
        <Link
          to={`/playlists`}
          state={{ editPlaylist: playlist }}
          className="fixed bottom-6 right-6 bg-secondary p-4 rounded-full shadow-lg hover:bg-hover transition-colors"
          aria-label="Edit playlist details"
        >
          <PencilIcon className="w-5 h-5" />
        </Link>
      )}
    </motion.div>
  );
};

export default PlaylistDetail;