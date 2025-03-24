import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowDownTrayIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useDownload } from '../../context/DownloadContext';
import { useNotification } from '../../context/NotificationContext';

const DownloadModal = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [downloadSubtitles, setDownloadSubtitles] = useState(true);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUrlValid, setIsUrlValid] = useState(false);
  
  const { startDownload, getVideoInfo, isYtDlpInstalled } = useDownload();
  const { error } = useNotification();
  
  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setDownloadSubtitles(true);
      setVideoInfo(null);
      setIsUrlValid(false);
    }
  }, [isOpen]);
  
  // Modal animations
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 }
  };
  
  // Fetch video info when URL changes
  const handleUrlChange = async (newUrl) => {
    setUrl(newUrl);
    setVideoInfo(null);
    
    if (!newUrl.trim() || !isYtDlpInstalled) return;
    
    // Basic validation for YouTube URL
    const isValidUrl = newUrl.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i);
    setIsUrlValid(Boolean(isValidUrl));
    
    if (isValidUrl) {
      setIsLoading(true);
      try {
        const info = await getVideoInfo(newUrl);
        if (info) {
          setVideoInfo(info);
        } else {
          setIsUrlValid(false); // Reset to false if no info was returned
        }
      } catch (err) {
        console.error('Error fetching video info:', err);
        setIsUrlValid(false);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      error('Please enter a valid YouTube URL');
      return;
    }
    
    // Check if yt-dlp is installed
    if (!isYtDlpInstalled) {
      error('yt-dlp is not installed. Please install it to download videos.');
      return;
    }
    
    // Verify that we have video info before proceeding
    if (!videoInfo) {
      error('Please wait for video information to be fetched');
      return;
    }
    
    // Start download with highest quality
    const success = await startDownload(url, '1080', downloadSubtitles);
    
    if (success) {
      onClose();
    }
  };
  
  // Determine if the download button should be enabled
  const isDownloadButtonDisabled = !url.trim() || isLoading || !isYtDlpInstalled || !videoInfo;
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={onClose}
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
              Download New Video
            </h2>
            <button
              className="text-text-primary hover:text-accent transition-colors"
              onClick={onClose}
              aria-label="Close"
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
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full h-10 px-4 bg-primary border border-[#3f3f3f] text-text-primary rounded text-base outline-none transition-all focus:border-[#5f5f5f]"
                />
              </div>
              
              {/* Video Info Preview */}
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                </div>
              )}
              
              {isUrlValid && !videoInfo && !isLoading && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <InformationCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-400">Video information unavailable</p>
                      <p className="text-xs text-yellow-400/70">
                        Unable to fetch details for this video. Please check the URL and try again.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {videoInfo && (
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
              
              {/* Download Subtitles */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="downloadSubtitles"
                  checked={downloadSubtitles}
                  onChange={(e) => setDownloadSubtitles(e.target.checked)}
                  className="w-4 h-4 text-accent bg-primary border-[#3f3f3f] rounded focus:ring-accent"
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
              className="btn btn-outline"
              onClick={onClose}
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
              {isLoading ? 'Fetching Info...' : videoInfo ? 'Start Download' : 'Start Download'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DownloadModal;