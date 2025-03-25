import { useEffect } from 'react';
import { useLibrary } from '../../context/LibraryContext';

/**
 * Component that polls for library changes and refreshes when needed
 * This serves as a fallback mechanism for when WebSocket events fail
 */
const LibraryRefreshPoller = () => {
  const { refreshLibrary } = useLibrary();
  
  useEffect(() => {
    let pollInterval;
    let lastCheckedDownloads = Date.now();
    
    // Function to check active downloads and refresh when needed
    const checkActiveDownloads = async () => {
      try {
        // Fetch active downloads
        const response = await fetch('/api/download/active');
        const activeDownloads = await response.json();
        
        // Check if any downloads recently completed by comparing counts
        if (window.previousDownloadCount && 
            activeDownloads.length < window.previousDownloadCount) {
          console.log('Download count decreased, refreshing library');
          refreshLibrary();
        }
        
        // Store the current count for next comparison
        window.previousDownloadCount = activeDownloads.length;
        
        // If there are no active downloads, check less frequently
        if (activeDownloads.length === 0) {
          lastCheckedDownloads = Date.now();
        }
      } catch (err) {
        console.error('Error checking download status:', err);
      }
    };
    
    // Start polling - check every 5 seconds if downloads are active
    // or every 30 seconds if no downloads are active
    pollInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckedDownloads;
      
      // If window.previousDownloadCount exists and is > 0, we have active downloads
      if (window.previousDownloadCount > 0 || timeSinceLastCheck >= 30000) {
        checkActiveDownloads();
        lastCheckedDownloads = now;
      }
    }, 5000);
    
    // Initial check
    checkActiveDownloads();
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [refreshLibrary]);
  
  // This component doesn't render anything
  return null;
};

export default LibraryRefreshPoller;