import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClockIcon, ArrowPathIcon, CheckCircleIcon, CalendarIcon } from '@heroicons/react/24/outline';

const VideoCard = ({ video, isDownloading = false, progress = 0 }) => {
  const {
    id,
    youtube_id,
    title,
    channel,
    thumbnail_url,
    duration_formatted,
    last_viewed,
    date_added,
    metadata
  } = video;

  // Try to get the publication date from metadata
  const getPublishedDate = () => {
    try {
      if (metadata) {
        // If metadata is a string, parse it
        const parsedMetadata = typeof metadata === 'string' 
          ? JSON.parse(metadata) 
          : metadata;
        
        // Check for upload_date or published_at in metadata
        if (parsedMetadata.upload_date) {
          // yt-dlp format: YYYYMMDD
          const uploadDate = parsedMetadata.upload_date;
          if (uploadDate && uploadDate.length === 8) {
            const year = uploadDate.substring(0, 4);
            const month = uploadDate.substring(4, 6);
            const day = uploadDate.substring(6, 8);
            return new Date(`${year}-${month}-${day}`);
          }
        }
        
        // Check alternative fields that might contain the date
        if (parsedMetadata.published_at) {
          return new Date(parsedMetadata.published_at);
        }
        
        if (parsedMetadata.publication_date) {
          return new Date(parsedMetadata.publication_date);
        }
      }
      
      // If we can't find a publication date, use date_added (download date)
      if (date_added) {
        return new Date(date_added);
      }
      
      // Last resort - use last_viewed if it exists
      if (last_viewed) {
        return new Date(last_viewed);
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing video metadata:', error);
      // Fallback to download date
      return date_added ? new Date(date_added) : null;
    }
  };

  // Format the date for display
  const formatDate = (dateObj) => {
    if (!dateObj) return 'Unknown date';
    
    const now = new Date();
    const diffYears = now.getFullYear() - dateObj.getFullYear();
    
    if (diffYears > 0) {
      return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
    }
    
    const diffMonths = now.getMonth() - dateObj.getMonth() + (12 * diffYears);
    if (diffMonths > 0) {
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    }
    
    const diffDays = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // If it's more than a week but less than a month
    return dateObj.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const publishedDate = getPublishedDate();
  const dateDisplay = formatDate(publishedDate);

  // Card animation
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    hover: { 
      y: -5, 
      boxShadow: '0 8px 15px rgba(0, 0, 0, 0.2)',
      transition: { duration: 0.3 }
    }
  };

  // Thumbnail animation
  const thumbnailVariants = {
    hover: { scale: 1.05, transition: { duration: 0.3 } }
  };

  const videoPath = `/video/${id || youtube_id}`;

  return (
    <motion.div
      className="video-card"
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
    >
      <Link to={videoPath} className="block">
        <div className="thumbnail-container">
          <motion.img
            src={thumbnail_url || '/placeholder-thumbnail.jpg'} 
            alt={title}
            className="thumbnail"
            variants={thumbnailVariants}
            loading="lazy"
          />
          <div className="duration">{duration_formatted}</div>
        </div>
        
        <div className="video-info">
          <h3 className="video-title">{title}</h3>
          
          <div className="video-meta flex justify-between items-center text-text-secondary text-sm">
            <span>{channel}</span>
            
            {isDownloading ? (
              <span className="timestamp flex items-center gap-1">
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Downloading...
              </span>
            ) : progress === 100 ? (
              <span className="timestamp flex items-center gap-1 text-green-500">
                <CheckCircleIcon className="w-4 h-4" />
                Complete
              </span>
            ) : (
              <span className="timestamp flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                {dateDisplay}
              </span>
            )}
          </div>
          
          {/* Progress bar for downloading videos */}
          {isDownloading && (
            <div className="mt-4 h-2 bg-primary rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default VideoCard;