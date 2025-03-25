import React from 'react';
import { FilmIcon } from '@heroicons/react/24/outline';

/**
 * Component to display video quality information
 * @param {Object} props Component props
 * @param {Object|string} props.metadata Video metadata (either as object or JSON string)
 * @returns {JSX.Element} Quality badge component
 */
const VideoQualityBadge = ({ metadata }) => {
  // Parse metadata if it's a string
  let parsedMetadata;
  try {
    parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  } catch (err) {
    console.error("Error parsing metadata:", err);
    return null;
  }
  
  // Function to determine video quality
  const getVideoQuality = () => {
    try {
      // Safety check
      if (!parsedMetadata) {
        return "Unknown";
      }
      
      // Check for height in formats
      if (parsedMetadata.height) {
        return `${parsedMetadata.height}p`;
      }
      
      // Check formats array for resolution information
      if (parsedMetadata.formats && Array.isArray(parsedMetadata.formats)) {
        // Find the video format with the highest resolution
        const videoFormats = parsedMetadata.formats.filter(f => 
          f.vcodec && f.vcodec !== 'none' && f.vcodec !== 'null'
        );
        
        if (videoFormats.length > 0) {
          // Sort by height (resolution) in descending order
          videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));
          const bestFormat = videoFormats[0];
          
          if (bestFormat.height) {
            return `${bestFormat.height}p`;
          }
        }
      }
      
      // Check requested_formats for resolution info
      if (parsedMetadata.requested_formats && Array.isArray(parsedMetadata.requested_formats)) {
        const videoFormat = parsedMetadata.requested_formats.find(f => 
          f.vcodec && f.vcodec !== 'none'
        );
        if (videoFormat && videoFormat.height) {
          return `${videoFormat.height}p`;
        }
      }
      
      // Check resolution string
      if (parsedMetadata.resolution) {
        return parsedMetadata.resolution;
      }
      
      return "Unknown";
    } catch (err) {
      console.error("Error determining video quality:", err);
      return "Unknown";
    }
  };

  const quality = getVideoQuality();
  
  return (
    <div className="flex items-center gap-1">
      <FilmIcon className="w-3.5 h-3.5 text-accent" />
      <span>{quality}</span>
    </div>
  );
};

export default VideoQualityBadge;