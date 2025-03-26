import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowDownTrayIcon, 
  ExclamationTriangleIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useDownload } from '../context/DownloadContext';
import { useNotification } from '../context/NotificationContext';
import VideoCard from '../components/video/VideoCard';
import CategoryPills from '../components/ui/CategoryPills';
import DownloadModal from '../components/downloads/DownloadModal';

const Downloads = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [failedDownloads, setFailedDownloads] = useState([]);
  
  const { 
    activeDownloads, 
    fetchActiveDownloads, 
    fetchDownloadHistory, 
    cancelDownload, 
    isLoading 
  } = useDownload();
  
  const { error, success } = useNotification();
  
  // Tabs for filtering downloads
  const tabs = [
    { label: 'Active Downloads', value: 'active' },
    { label: 'Failed Downloads', value: 'failed' }
  ];
  
  // Fetch active downloads and failed ones on mount
  useEffect(() => {
    fetchActiveDownloads();
    fetchFailedDownloads();
  }, [fetchActiveDownloads]);
  
  // Fetch failed downloads
  const fetchFailedDownloads = async () => {
    try {
      const result = await fetchDownloadHistory(50, 0);
      if (result && result.downloads) {
        // Filter only the failed downloads
        const failed = result.downloads.filter(download => download.status === 'failed');
        setFailedDownloads(failed);
      }
    } catch (err) {
      console.error('Failed to fetch download history:', err);
    }
  };
  
  // Cancel a download
  const handleCancelDownload = async (youtubeId) => {
    try {
      const result = await cancelDownload(youtubeId);
      if (result) {
        // Refresh the lists
        fetchActiveDownloads();
        fetchFailedDownloads();
      }
    } catch (err) {
      error('Failed to cancel download');
    }
  };
  
  // Page animation variants
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

  // Item animation variants
  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };
  
  return (
    <motion.div
      className="container mx-auto px-6 pt-6 pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <ArrowDownTrayIcon className="w-7 h-7 text-accent" />
          <h1 className="text-2xl font-bold">Downloads</h1>
        </div>
        
        <motion.button
          className="btn btn-primary flex items-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDownloadModalOpen(true)}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Download
        </motion.button>
      </div>
      
      <div className="mb-6">
        <CategoryPills
          categories={tabs}
          activeCategory={activeTab}
          onChange={setActiveTab}
        />
      </div>
      
      {/* Active Downloads */}
      {activeTab === 'active' && (
        <>
          {activeDownloads.filter(download => !download.is_playlist).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeDownloads
                .filter(download => !download.is_playlist) // Only show non-playlist downloads here
                .map(download => (
                  <motion.div 
                    key={download.youtube_id} 
                    className="relative group"
                    variants={itemVariants}
                  >
                    <VideoCard
                      video={{
                        youtube_id: download.youtube_id,
                        title: download.title || 'Downloading...',
                        channel: download.youtube_id,
                        thumbnail_url: `https://i.ytimg.com/vi/${download.youtube_id}/mqdefault.jpg`,
                        duration_formatted: '--:--'
                      }}
                      isDownloading={true}
                      progress={download.progress || 0}
                    />
                    
                    <button
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCancelDownload(download.youtube_id)}
                      aria-label="Cancel download"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
            </div>
          ) : activeDownloads.filter(download => download.is_playlist).length === 0 ? (
            // Only show the "no active downloads" message if there are no playlists either
            <motion.div 
              className="flex flex-col items-center justify-center py-16 text-text-secondary"
              variants={itemVariants}
            >
              <ArrowDownTrayIcon className="w-16 h-16 mb-4 opacity-30" />
              <h3 className="text-xl font-medium mb-2">No active downloads</h3>
              <p className="text-center max-w-md mb-6">
                Start downloading videos to watch them offline
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setIsDownloadModalOpen(true)}
              >
                Start a Download
              </button>
            </motion.div>
          ) : null}
          {activeDownloads.filter(download => download.is_playlist).length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Active Playlist Downloads</h3>
              <div className="space-y-4">
                {activeDownloads
                  .filter(download => download.is_playlist)
                  .map(download => (
                    <div 
                      key={`playlist-${download.youtube_id}`}
                      className="bg-secondary rounded-lg p-4"
                    >
                      <div className="flex justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-lg">{download.title || 'YouTube Playlist'}</h4>
                          <p className="text-text-secondary text-sm">
                            {download.playlist_complete || 0} of {download.playlist_size || '?'} videos downloaded
                          </p>
                        </div>
                        <button
                          className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                          onClick={() => handleCancelDownload(download.youtube_id)}
                          aria-label="Cancel download"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold inline-block text-accent">
                              {`${Math.round(download.progress)}%`}
                            </span>
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-primary">
                          <motion.div
                            className="flex flex-col text-center whitespace-nowrap text-white justify-center bg-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${download.progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Failed Downloads */}
      {activeTab === 'failed' && (
        <>
          {failedDownloads.length > 0 ? (
            <div className="space-y-4">
              {failedDownloads.map(download => (
                <motion.div
                  key={download.id}
                  className="bg-secondary rounded-lg p-4 flex flex-col sm:flex-row gap-4"
                  variants={itemVariants}
                >
                  <div className="sm:w-48 flex-shrink-0">
                    <div className="aspect-video bg-primary rounded overflow-hidden">
                      {download.youtube_id && (
                        <img
                          src={`https://i.ytimg.com/vi/${download.youtube_id}/mqdefault.jpg`}
                          alt="thumbnail"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = '/placeholder-thumbnail.jpg';
                          }}
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium mb-1 line-clamp-1">
                          {download.title || download.youtube_id || 'Unknown video'}
                        </h3>
                        <p className="text-sm text-text-secondary mb-2 line-clamp-1">
                          {download.url}
                        </p>
                      </div>
                      
                      <span className="flex items-center gap-1 text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded-full">
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        Failed
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-text-secondary mt-2">
                      <div>
                        <p>Started: {new Date(download.date_started).toLocaleString()}</p>
                        {download.date_completed && (
                          <p>Failed at: {new Date(download.date_completed).toLocaleString()}</p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          // Copy URL to clipboard for retrying
                          navigator.clipboard.writeText(download.url);
                          success('URL copied to clipboard');
                        }}
                        className="btn btn-outline text-xs py-1 px-3"
                      >
                        Retry
                      </button>
                    </div>
                    
                    {download.error_message && (
                      <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                        <p className="font-semibold mb-1">Error:</p>
                        <p className="font-mono whitespace-pre-wrap">{download.error_message}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              className="flex flex-col items-center justify-center py-16 text-text-secondary"
              variants={itemVariants}
            >
              <ExclamationTriangleIcon className="w-16 h-16 mb-4 opacity-30" />
              <h3 className="text-xl font-medium mb-2">No failed downloads</h3>
              <p className="text-center max-w-md">
                All your download attempts have been successful
              </p>
            </motion.div>
          )}
        </>
      )}
      
      {/* Download Modal */}
      {isDownloadModalOpen && (
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
        />
      )}
    </motion.div>
  );
};

export default Downloads;