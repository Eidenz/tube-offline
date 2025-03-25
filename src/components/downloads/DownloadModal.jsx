import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  ArrowDownTrayIcon, 
  CheckCircleIcon, 
  InformationCircleIcon, 
  QueueListIcon,
  ChevronDownIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import { useDownload } from '../../context/DownloadContext';
import { useNotification } from '../../context/NotificationContext';
import { useLibrary } from '../../context/LibraryContext';

const DownloadModal = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [downloadSubtitles, setDownloadSubtitles] = useState(true);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUrlValid, setIsUrlValid] = useState(false);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [createLocalPlaylist, setCreateLocalPlaylist] = useState(true);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState([]);
  
  const { startDownload, getVideoInfo, isYtDlpInstalled, downloadPlaylist, getPlaylistInfo } = useDownload();
  const { createPlaylist, playlists, fetchPlaylists } = useLibrary();
  const { error, success } = useNotification();
  
  // Reset form when modal is opened and fetch playlists
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setDownloadSubtitles(true);
      setVideoInfo(null);
      setIsUrlValid(false);
      setIsPlaylist(false);
      setPlaylistInfo(null);
      setCreateLocalPlaylist(false);
      setSelectedPlaylistId(null);
      setIsSubmitting(false);
      setShowPlaylistDropdown(false);
      
      // Fetch available playlists
      fetchPlaylists()
        .then(playlistData => {
          setAvailablePlaylists(playlistData || []);
        })
        .catch(err => {
          console.error('Failed to fetch playlists:', err);
          setAvailablePlaylists([]);
        });
    }
  }, [isOpen, fetchPlaylists]);
  
  // Modal animations
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 }
  };
  
  // Dropdown animations
  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, height: 0 },
    visible: { opacity: 1, y: 0, height: 'auto' }
  };
  
  // Fetch video info when URL changes
  const handleUrlChange = async (newUrl) => {
    setUrl(newUrl);
    setVideoInfo(null);
    setPlaylistInfo(null);
    
    if (!newUrl.trim() || !isYtDlpInstalled) return;
    
    // Check if it's a playlist URL
    const isPlaylistUrl = newUrl.includes('playlist?list=') || 
                          newUrl.includes('&list=') || 
                          newUrl.includes('youtube.com/c/') ||
                          newUrl.includes('youtube.com/channel/') ||
                          newUrl.includes('youtube.com/user/');
    
    setIsPlaylist(isPlaylistUrl);
    
    // Basic validation for YouTube URL
    const isValidUrl = newUrl.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i);
    setIsUrlValid(Boolean(isValidUrl));
    
    if (isValidUrl) {
      setIsLoading(true);
      try {
        if (isPlaylistUrl) {
          // Get playlist info
          const info = await getPlaylistInfo(newUrl);
          if (info && info.success) {
            setPlaylistInfo(info);
          } else {
            setIsUrlValid(false);
          }
        } else {
          // Get single video info
          const info = await getVideoInfo(newUrl);
          if (info) {
            setVideoInfo(info);
          } else {
            setIsUrlValid(false);
          }
        }
      } catch (err) {
        console.error('Error fetching video/playlist info:', err);
        setIsUrlValid(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Toggle playlist dropdown
  const togglePlaylistDropdown = () => {
    setShowPlaylistDropdown(!showPlaylistDropdown);
  };

  // Select a playlist
  const handleSelectPlaylist = (id) => {
    if (id === 'create-new') {
      setCreateLocalPlaylist(true);
      setSelectedPlaylistId(null);
    } else {
      setCreateLocalPlaylist(false);
      setSelectedPlaylistId(id);
    }
    setShowPlaylistDropdown(false);
  };
  
  // Get selected playlist name for display
  const getSelectedPlaylistName = () => {
    if (selectedPlaylistId) {
      const playlist = availablePlaylists.find(p => p.id === selectedPlaylistId);
      return playlist ? playlist.name : "Select a playlist...";
    }
    if (createLocalPlaylist && isPlaylist) {
      return "Create new playlist";
    }
    return "Don't add to playlist";
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent multiple submissions
    
    if (!url.trim()) {
      error('Please enter a valid YouTube URL');
      return;
    }
    
    // Check if yt-dlp is installed
    if (!isYtDlpInstalled) {
      error('yt-dlp is not installed. Please install it to download videos.');
      return;
    }
    
    // Set submitting state to prevent multiple clicks
    setIsSubmitting(true);
    
    // Save the selected playlist ID for later use
    const playlistToAddTo = selectedPlaylistId;
    
    try {
      if (isPlaylist) {
        // Handle playlist download
        if (!playlistInfo) {
          error('Please wait for playlist information to be fetched');
          setIsSubmitting(false);
          return;
        }
        
        // Start playlist download
        let localPlaylistId = selectedPlaylistId;
        
        // Create local playlist if option is checked and no playlist is selected
        if (createLocalPlaylist && isPlaylist && playlistInfo.title) {
          try {
            const newPlaylist = await createPlaylist(
              playlistInfo.title,
              `Downloaded from YouTube: ${url}`
            );
            
            if (newPlaylist) {
              localPlaylistId = newPlaylist.id;
              success(`Created playlist: ${playlistInfo.title}`);
            }
          } catch (err) {
            console.error('Failed to create local playlist:', err);
            error('Could not create local playlist, but downloads will continue');
          }
        }
        
        // Start the playlist download
        const downloadSuccess = await downloadPlaylist(
          url, 
          '1080', 
          downloadSubtitles, 
          localPlaylistId
        );
        
        if (downloadSuccess) {
          success(`Downloading playlist: ${playlistInfo.title || 'YouTube Playlist'}`);
          onClose();
        } else {
          setIsSubmitting(false);
        }
      } else {
        // Handle single video download
        if (!videoInfo) {
          error('Please wait for video information to be fetched');
          setIsSubmitting(false);
          return;
        }
        
        // Start download with highest quality using startDownload from context
        const downloadSuccess = await startDownload(
          url,
          'best',
          downloadSubtitles,
          playlistToAddTo
        );
        
        if (downloadSuccess) {
          onClose();
        } else {
          setIsSubmitting(false);
        }
      }
    } catch (err) {
      console.error('Failed to start download:', err);
      
      if (err.response?.status === 409) {
        error('This video is already being downloaded');
      } else {
        error('Failed to start download');
      }
      
      setIsSubmitting(false);
    }
  };
  
  // Determine if the download button should be enabled
  const isDownloadButtonDisabled = 
    !url.trim() || 
    isLoading || 
    !isYtDlpInstalled || 
    (!videoInfo && !playlistInfo) ||
    isSubmitting;
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={() => !isSubmitting && onClose()}
      >
        <motion.div
          className="bg-secondary rounded-xl w-full max-w-lg shadow-xl overflow-hidden"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center p-4 border-b border-[#3f3f3f]">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ArrowDownTrayIcon className="w-5 h-5 text-accent" />
              Download {isPlaylist ? 'YouTube Playlist' : 'Video'}
            </h2>
            <button
              className={`text-text-primary hover:text-accent transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isSubmitting && onClose()}
              aria-label="Close"
              disabled={isSubmitting}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Modal Body */}
          <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* YouTube URL */}
              <div className="space-y-2">
                <label htmlFor="videoUrl" className="block text-sm text-text-secondary">
                  YouTube URL
                </label>
                <input
                  type="text"
                  id="videoUrl"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://youtube.com/playlist?list=..."
                  className={`w-full h-10 px-4 bg-primary border border-[#3f3f3f] text-text-primary rounded text-base outline-none transition-all focus:border-[#5f5f5f] ${isSubmitting ? 'opacity-70' : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Video/Playlist Info Preview */}
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                </div>
              )}
              
              {isUrlValid && !videoInfo && !playlistInfo && !isLoading && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <InformationCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-400">Information unavailable</p>
                      <p className="text-xs text-yellow-400/70">
                        Unable to fetch details for this {isPlaylist ? 'playlist' : 'video'}. Please check the URL and try again.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Single Video Preview */}
              {videoInfo && !isPlaylist && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-primary/50 rounded-lg p-3 flex gap-3"
                >
                  {videoInfo.thumbnail && (
                    <img 
                      src={videoInfo.thumbnail} 
                      alt={videoInfo.title} 
                      className="w-20 h-auto rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{videoInfo.title}</h3>
                    <p className="text-xs text-text-secondary">{videoInfo.channel}</p>
                    <p className="text-xs text-text-secondary">
                      {videoInfo.duration ? `${Math.floor(videoInfo.duration / 60)}:${(videoInfo.duration % 60).toString().padStart(2, '0')}` : ''}
                    </p>
                  </div>
                  <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                </motion.div>
              )}
              
              {/* Playlist Preview */}
              {playlistInfo && isPlaylist && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-primary/50 rounded-lg p-3"
                >
                  <div className="flex gap-3 mb-2">
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 bg-secondary/50 rounded flex items-center justify-center">
                        <QueueListIcon className="w-10 h-10 text-accent/50" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">{playlistInfo.title || 'YouTube Playlist'}</h3>
                      <p className="text-xs text-text-secondary">{playlistInfo.channel || 'YouTube Channel'}</p>
                      <p className="text-xs text-text-secondary font-medium mt-2">
                        {playlistInfo.videoCount || 'Multiple'} videos in this playlist
                      </p>
                    </div>
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                  </div>
                </motion.div>
              )}
              
              {!isYtDlpInstalled && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <InformationCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-400">yt-dlp is not installed</p>
                      <p className="text-xs text-yellow-400/70">
                        Please install yt-dlp to enable video downloads.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Playlist Selection */}
              {(videoInfo || playlistInfo) && (
                <div className="space-y-2">
                  <label className="block text-sm text-text-secondary">
                    Add to playlist
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2 bg-primary border border-[#3f3f3f] text-text-primary rounded text-sm hover:bg-hover transition-colors"
                      onClick={togglePlaylistDropdown}
                      disabled={isSubmitting}
                    >
                      <span>{getSelectedPlaylistName()}</span>
                      <ChevronDownIcon className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {showPlaylistDropdown && (
                        <motion.div
                          className="absolute top-full left-0 right-0 mt-1 bg-primary border border-[#3f3f3f] rounded-lg shadow-lg z-10 overflow-y-auto"
                          variants={dropdownVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          style={{
                            maxHeight: '11vh'
                          }}
                        >
                          {/* Create new playlist option (only shown for playlists) */}
                          {isPlaylist && (
                            <div
                              className="p-3 flex items-center gap-2 hover:bg-hover cursor-pointer border-b border-[#3f3f3f]"
                              onClick={() => handleSelectPlaylist('create-new')}
                            >
                              <PlusCircleIcon className="w-5 h-5 text-accent" />
                              <span>Create new playlist</span>
                            </div>
                          )}
                        
                          {/* Don't add to playlist option */}
                          <div
                            className="p-3 flex items-center gap-2 hover:bg-hover cursor-pointer border-b border-[#3f3f3f]"
                            onClick={() => handleSelectPlaylist(null)}
                          >
                            <span>Don't add to playlist</span>
                          </div>
                        
                          {/* List of available playlists */}
                          {availablePlaylists.length > 0 ? (
                            availablePlaylists.map(playlist => (
                              <div
                                key={playlist.id}
                                className="p-3 flex items-center gap-2 hover:bg-hover cursor-pointer"
                                onClick={() => handleSelectPlaylist(playlist.id)}
                              >
                                <QueueListIcon className="w-5 h-5" />
                                <span className="truncate">{playlist.name}</span>
                                <span className="text-xs text-text-secondary ml-auto">
                                  {playlist.video_count} videos
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-text-secondary text-sm italic">
                              No playlists available
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
              
              {/* Download Subtitles */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="downloadSubtitles"
                  checked={downloadSubtitles}
                  onChange={(e) => setDownloadSubtitles(e.target.checked)}
                  className="w-4 h-4 text-accent bg-primary border-[#3f3f3f] rounded focus:ring-accent"
                  disabled={isSubmitting}
                />
                <label htmlFor="downloadSubtitles" className="ml-2 text-sm text-text-secondary">
                  Download English subtitles (when available)
                </label>
              </div>
            </form>
          </div>
          
          {/* Modal Footer */}
          <div className="flex justify-end p-4 border-t border-[#3f3f3f] gap-3">
            <button
              className={`btn btn-outline ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <motion.button
              className={`btn btn-primary ${isDownloadButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleSubmit}
              whileHover={!isDownloadButtonDisabled ? { scale: 1.05 } : {}}
              whileTap={!isDownloadButtonDisabled ? { scale: 0.95 } : {}}
              disabled={isDownloadButtonDisabled}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Starting...</span>
                </div>
              ) : isLoading ? 'Fetching Info...' : 
                 isPlaylist ? 'Download Playlist' : 'Start Download'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DownloadModal;