import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QueueListIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  XMarkIcon, 
  FilmIcon,
  ClockIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { useLibrary } from '../context/LibraryContext';
import { useNotification } from '../context/NotificationContext';
import axios from 'axios';

const Playlists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedThumbnailUrl, setSelectedThumbnailUrl] = useState('');
  const [isLoadingPlaylistVideos, setIsLoadingPlaylistVideos] = useState(false);
  
  const location = useLocation();
  
  const { 
    fetchPlaylists, 
    createPlaylist, 
    updatePlaylist, 
    deletePlaylist,
    videos,
    getPlaylistThumbnail
  } = useLibrary();
  const { success, error } = useNotification();
  
  // Fetch playlists on mount
  useEffect(() => {
    const getPlaylists = async () => {
      setIsLoading(true);
      try {
        const data = await fetchPlaylists();
        setPlaylists(data);
      } catch (err) {
        console.error('Failed to fetch playlists:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    getPlaylists();
  }, [fetchPlaylists]);
  
  // Fetch playlist videos when editing
  useEffect(() => {
    if (selectedPlaylist && selectedPlaylist.id) {
      const fetchPlaylistVideos = async () => {
        setIsLoadingPlaylistVideos(true);
        try {
          const response = await axios.get(`/api/playlists/${selectedPlaylist.id}`);
          if (response.data && response.data.videos) {
            setSelectedPlaylistVideos(response.data.videos);
          } else {
            setSelectedPlaylistVideos([]);
          }
        } catch (err) {
          console.error('Failed to fetch playlist videos:', err);
          setSelectedPlaylistVideos([]);
        } finally {
          setIsLoadingPlaylistVideos(false);
        }
      };
      
      fetchPlaylistVideos();
    } else {
      setSelectedPlaylistVideos([]);
    }
  }, [selectedPlaylist]);
  
  // Handle creating a new playlist
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    
    if (!newPlaylistName.trim()) {
      error('Please enter a playlist name');
      return;
    }
    
    try {
      const newPlaylist = await createPlaylist(
        newPlaylistName, 
        newPlaylistDescription,
        selectedThumbnailUrl
      );
      
      if (newPlaylist) {
        setPlaylists([...playlists, newPlaylist]);
        setNewPlaylistName('');
        setNewPlaylistDescription('');
        setSelectedThumbnailUrl('');
        setIsCreateModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to create playlist:', err);
    }
  };
  
  // Handle updating a playlist
  const handleUpdatePlaylist = async (e) => {
    e.preventDefault();
    
    if (!newPlaylistName.trim()) {
      error('Please enter a playlist name');
      return;
    }
    
    try {
      const updatedPlaylist = await updatePlaylist(
        selectedPlaylist.id, 
        {
          name: newPlaylistName,
          description: newPlaylistDescription
        },
        selectedThumbnailUrl || undefined
      );
      
      if (updatedPlaylist) {
        setPlaylists(playlists.map(p => p.id === selectedPlaylist.id ? updatedPlaylist : p));
        setIsEditModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to update playlist:', err);
    }
  };
  
  // Handle deleting a playlist
  const handleDeletePlaylist = async () => {
    try {
      const result = await deletePlaylist(selectedPlaylist.id);
      
      if (result) {
        setPlaylists(playlists.filter(p => p.id !== selectedPlaylist.id));
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
  };
  
  // Open the edit modal with playlist data
  const openEditModal = (playlist) => {
    setSelectedPlaylist(playlist);
    setNewPlaylistName(playlist.name);
    setNewPlaylistDescription(playlist.description || '');
    setSelectedThumbnailUrl(getPlaylistThumbnail(playlist.id) || '');
    setIsEditModalOpen(true);
  };
  
  // Open the delete confirmation modal
  const openDeleteModal = (playlist) => {
    setSelectedPlaylist(playlist);
    setIsDeleteModalOpen(true);
  };
  
  // Calculate the time since the playlist was created or updated
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };
  
  // Get playlist thumbnail URL
  const getPlaylistThumbnailUrl = (playlist) => {
    const thumbnailUrl = getPlaylistThumbnail(playlist.id);
    if (thumbnailUrl) return thumbnailUrl;
    
    // Default image if no thumbnail
    return '/placeholder-thumbnail.jpg';
  };
  
  // Page animation
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };
  
  // Card animation
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  };
  
  // Check if we should open edit modal based on location state
  useEffect(() => {
    if (location.state?.editPlaylist) {
      openEditModal(location.state.editPlaylist);
      // Clear the state to avoid reopening on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  return (
    <motion.div
      className="container mx-auto px-6 pt-6 pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <QueueListIcon className="w-7 h-7 text-accent" />
          <h1 className="text-2xl font-bold">Playlists</h1>
        </div>
        
        <motion.button
          className="btn btn-primary flex items-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          <span>Create Playlist</span>
        </motion.button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : playlists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {playlists.map(playlist => (
            <motion.div
              key={playlist.id}
              className="bg-secondary rounded-xl overflow-hidden shadow-card group hover:shadow-card-hover transition-all duration-300"
              variants={cardVariants}
              whileHover={{ y: -5 }}
            >
              <Link to={`/playlist/${playlist.id}`} className="block">
                <div className="aspect-video bg-primary flex items-center justify-center relative overflow-hidden">
                  {getPlaylistThumbnail(playlist.id) ? (
                    <img 
                      src={getPlaylistThumbnailUrl(playlist)} 
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FilmIcon className="w-16 h-16 text-text-secondary/30" />
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-text-primary px-2 py-1 rounded text-xs">
                    {playlist.video_count} videos
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-medium text-lg mb-1 line-clamp-1">{playlist.name}</h3>
                  
                  {playlist.description && (
                    <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                      {playlist.description}
                    </p>
                  )}
                  
                  <div className="flex items-center text-xs text-text-secondary">
                    <ClockIcon className="w-3 h-3 mr-1" />
                    <span>Updated {getTimeAgo(playlist.last_updated)}</span>
                  </div>
                </div>
              </Link>
              
              <div className="flex border-t border-[#3f3f3f] divide-x divide-[#3f3f3f]">
                <button
                  className="flex-1 py-2 text-center text-text-secondary hover:text-text-primary hover:bg-hover transition-colors text-sm"
                  onClick={() => openEditModal(playlist)}
                >
                  <PencilIcon className="w-4 h-4 mx-auto" />
                </button>
                
                <button
                  className="flex-1 py-2 text-center text-text-secondary hover:text-red-500 hover:bg-hover transition-colors text-sm"
                  onClick={() => openDeleteModal(playlist)}
                >
                  <TrashIcon className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
          <QueueListIcon className="w-16 h-16 mb-4 opacity-30" />
          <h3 className="text-xl font-medium mb-2">No playlists yet</h3>
          <p className="text-center max-w-md mb-6">
            Create your first playlist to organize your videos
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Playlist
          </button>
        </div>
      )}
      
      {/* Create Playlist Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCreateModalOpen(false)}
          >
            <motion.div
              className="bg-secondary rounded-xl w-full max-w-md"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-[#3f3f3f]">
                <h2 className="text-xl font-semibold">Create Playlist</h2>
                <button
                  className="text-text-primary hover:text-accent transition-colors"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreatePlaylist} className="p-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="playlist-name" className="block text-sm text-text-secondary mb-1">
                      Playlist Name*
                    </label>
                    <input
                      id="playlist-name"
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Enter playlist name"
                      className="w-full h-10 px-4 bg-primary border border-[#3f3f3f] text-text-primary rounded text-base outline-none transition-all focus:border-[#5f5f5f]"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="playlist-description" className="block text-sm text-text-secondary mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      id="playlist-description"
                      value={newPlaylistDescription}
                      onChange={(e) => setNewPlaylistDescription(e.target.value)}
                      placeholder="Enter playlist description"
                      className="w-full h-24 px-4 py-2 bg-primary border border-[#3f3f3f] text-text-primary rounded text-base outline-none transition-all focus:border-[#5f5f5f] resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Playlist Thumbnail (optional)
                    </label>
                    <div className="mb-2">
                      {selectedThumbnailUrl ? (
                        <div className="relative w-full aspect-video rounded overflow-hidden border border-[#3f3f3f]">
                          <img 
                            src={selectedThumbnailUrl} 
                            alt="Selected thumbnail" 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-2 right-2 bg-black/80 p-1 rounded-full"
                            onClick={() => setSelectedThumbnailUrl('')}
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full aspect-video bg-primary/50 rounded flex flex-col items-center justify-center border border-[#3f3f3f] border-dashed">
                          <PhotoIcon className="w-8 h-8 text-text-secondary/50 mb-2" />
                          <p className="text-sm text-text-secondary">No thumbnail selected</p>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-text-secondary">
                      A thumbnail will be automatically assigned from the first video you add to this playlist.
                      You can change it later after adding videos.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!newPlaylistName.trim()}
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Edit Playlist Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsEditModalOpen(false)}
          >
            <motion.div
              className="bg-secondary rounded-xl w-full max-w-md"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b border-[#3f3f3f]">
                <h2 className="text-xl font-semibold">Edit Playlist</h2>
                <button
                  className="text-text-primary hover:text-accent transition-colors"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleUpdatePlaylist} className="p-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-playlist-name" className="block text-sm text-text-secondary mb-1">
                      Playlist Name*
                    </label>
                    <input
                      id="edit-playlist-name"
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Enter playlist name"
                      className="w-full h-10 px-4 bg-primary border border-[#3f3f3f] text-text-primary rounded text-base outline-none transition-all focus:border-[#5f5f5f]"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-playlist-description" className="block text-sm text-text-secondary mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      id="edit-playlist-description"
                      value={newPlaylistDescription}
                      onChange={(e) => setNewPlaylistDescription(e.target.value)}
                      placeholder="Enter playlist description"
                      className="w-full h-24 px-4 py-2 bg-primary border border-[#3f3f3f] text-text-primary rounded text-base outline-none transition-all focus:border-[#5f5f5f] resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Playlist Thumbnail
                    </label>
                    <div className="mb-2">
                      {selectedThumbnailUrl ? (
                        <div className="relative w-full aspect-video rounded overflow-hidden border border-[#3f3f3f]">
                          <img 
                            src={selectedThumbnailUrl} 
                            alt="Selected thumbnail" 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-2 right-2 bg-black/80 p-1 rounded-full"
                            onClick={() => setSelectedThumbnailUrl('')}
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full aspect-video bg-primary/50 rounded flex flex-col items-center justify-center border border-[#3f3f3f] border-dashed">
                          <PhotoIcon className="w-8 h-8 text-text-secondary/50 mb-2" />
                          <p className="text-sm text-text-secondary">No thumbnail selected</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Show video thumbnails from this playlist only */}
                    {selectedPlaylist && selectedPlaylist.video_count > 0 ? (
                      <div>
                        <p className="text-sm text-text-secondary mb-2">Select a thumbnail from your playlist videos:</p>
                        {isLoadingPlaylistVideos ? (
                          <div className="flex justify-center p-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                          </div>
                        ) : selectedPlaylistVideos.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                            {selectedPlaylistVideos.map(video => (
                              <button
                                key={video.id}
                                type="button"
                                className={`aspect-video rounded overflow-hidden border-2 ${
                                  selectedThumbnailUrl === video.thumbnail_url 
                                    ? 'border-accent' 
                                    : 'border-transparent'
                                }`}
                                onClick={() => setSelectedThumbnailUrl(video.thumbnail_url)}
                              >
                                <img 
                                  src={video.thumbnail_url} 
                                  alt={video.title} 
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-text-secondary">No videos found in this playlist.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary">
                        {selectedPlaylist && selectedPlaylist.video_count === 0 
                          ? "Add videos to this playlist to select a thumbnail."
                          : "Loading playlist videos..."}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!newPlaylistName.trim()}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDeleteModalOpen(false)}
          >
            <motion.div
              className="bg-secondary rounded-xl w-full max-w-md"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <TrashIcon className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Delete Playlist</h2>
                    <p className="text-text-secondary text-sm">
                      Are you sure you want to delete "{selectedPlaylist?.name}"?
                    </p>
                  </div>
                </div>
                
                <p className="text-text-secondary mb-6">
                  This action cannot be undone. The playlist will be deleted, but the videos will remain in your library.
                </p>
                
                <div className="flex justify-end gap-3">
                  <button
                    className="btn btn-outline"
                    onClick={() => setIsDeleteModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn bg-red-600 hover:bg-red-700 text-white border-none"
                    onClick={handleDeletePlaylist}
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

export default Playlists;