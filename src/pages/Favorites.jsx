import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeartIcon } from '@heroicons/react/24/solid';
import { useLibrary } from '../context/LibraryContext';
import { useNotification } from '../context/NotificationContext';
import VideoCard from '../components/video/VideoCard';
import { useInView } from 'react-intersection-observer';

const Favorites = () => {
  const [favoriteVideos, setFavoriteVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getFavorites, removeFromFavorites, pagination } = useLibrary();
  const { error, success } = useNotification();
  
  // Setup intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  // Load favorites
  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoading(true);
      try {
        const data = await getFavorites();
        setFavoriteVideos(data);
      } catch (err) {
        console.error('Failed to fetch favorites:', err);
        error('Failed to load favorite videos');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFavorites();
  }, [getFavorites, error]);
  
  // Load more favorites when scrolling to the bottom
  useEffect(() => {
    if (inView && pagination.hasMore && !isLoading) {
      const loadMore = async () => {
        try {
          const moreData = await getFavorites(pagination.limit, pagination.offset + pagination.limit);
          setFavoriteVideos(prev => [...prev, ...moreData]);
        } catch (err) {
          console.error('Failed to fetch more favorites:', err);
        }
      };
      
      loadMore();
    }
  }, [inView, pagination, isLoading, getFavorites]);
  
  // Remove a video from favorites
  const handleRemoveFromFavorites = async (videoId) => {
    try {
      await removeFromFavorites(videoId);
      setFavoriteVideos(favoriteVideos.filter(video => video.id !== videoId));
      success('Video removed from favorites');
    } catch (err) {
      console.error('Failed to remove from favorites:', err);
      error('Failed to remove video from favorites');
    }
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <motion.div
      className="container mx-auto px-6 pt-6 pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-8">
        <HeartIcon className="w-7 h-7 text-red-500" />
        <h1 className="text-2xl font-bold">Favorites</h1>
      </div>
      
      {isLoading && favoriteVideos.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : favoriteVideos.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {favoriteVideos.map(video => (
            <motion.div 
              key={video.id}
              variants={itemVariants}
              className="relative group"
            >
              <VideoCard video={video} />
              
              <button
                className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveFromFavorites(video.id)}
                aria-label="Remove from favorites"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <HeartIcon className="w-12 h-12 text-red-500/30" />
          </div>
          <h3 className="text-xl font-medium mb-2">No favorite videos yet</h3>
          <p className="text-center max-w-md mb-6">
            Videos you mark as favorites will appear here for easy access.
          </p>
        </div>
      )}
      
      {/* Loading more indicator */}
      {pagination.hasMore && (
        <div 
          ref={ref}
          className="flex justify-center items-center py-8"
        >
          {isLoading && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default Favorites;