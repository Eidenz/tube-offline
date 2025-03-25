import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FilmIcon } from '@heroicons/react/24/outline';
import { useLibrary } from '../context/LibraryContext';
import VideoCard from '../components/video/VideoCard';
import CategoryPills from '../components/ui/CategoryPills';

const Home = () => {
  const { videos, fetchVideos, pagination, isLoading, searchVideos, getTopTags } = useLibrary();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [topTags, setTopTags] = useState([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [displayCount, setDisplayCount] = useState(20); // Display 20 videos initially (5 rows of 4)
  
  // Fetch top tags on mount
  useEffect(() => {
    const fetchTopTags = async () => {
      setIsLoadingTags(true);
      try {
        const tagData = await getTopTags(10);
        
        // Format tags for category pills
        const formattedTags = [
          { label: 'All', value: 'all' },
          ...tagData.map(tag => ({
            label: `${tag.name} (${tag.video_count})`,
            value: tag.name
          }))
        ];
        
        setTopTags(formattedTags);
      } catch (err) {
        console.error('Failed to fetch top tags:', err);
        // Fallback to basic All category
        setTopTags([{ label: 'All', value: 'all' }]);
      } finally {
        setIsLoadingTags(false);
      }
    };
    
    fetchTopTags();
  }, [getTopTags]);
  
  // Load videos when category changes or on initial load
  useEffect(() => {
    const filterByTag = async () => {
      if (selectedCategory === 'all') {
        // For all category, fetch initial videos with a limit of at least displayCount
        try {
          const result = await fetchVideos(Math.max(20, displayCount), 0);
          if (result && result.videos) {
            setFilteredVideos(result.videos);
          }
        } catch (err) {
          console.error('Failed to fetch videos:', err);
        }
      } else {
        // For specific tag, search with that tag
        try {
          const result = await searchVideos(selectedCategory, 'tag', Math.max(20, displayCount), 0);
          if (result && result.videos) {
            setFilteredVideos(result.videos);
          } else {
            setFilteredVideos([]);
          }
        } catch (err) {
          console.error('Failed to filter by tag:', err);
          setFilteredVideos([]);
        }
      }
    };
    
    filterByTag();
  }, [selectedCategory, fetchVideos, searchVideos, displayCount]);
  
  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    // Reset display count when category changes
    setDisplayCount(20);
  };
  
  // Handle load more button click
  const handleLoadMore = async () => {
    // If we have more videos in the filtered list, just show more of them
    if (filteredVideos.length > visibleVideos.length) {
      // Increase display count by 20 (5 rows of 4 videos)
      setDisplayCount(prevCount => prevCount + 20);
    } 
    // Otherwise, if there are more videos to fetch from the API, fetch them
    else if (pagination.hasMore && !isLoading) {
      try {
        if (selectedCategory === 'all') {
          // For all category, fetch more videos
          const result = await fetchVideos(pagination.limit, pagination.offset + pagination.limit);
          if (result && result.videos) {
            setFilteredVideos(prev => [...prev, ...result.videos]);
          }
        } else {
          // For specific tag, search with that tag and load more
          const result = await searchVideos(
            selectedCategory, 
            'tag', 
            pagination.limit, 
            pagination.offset + pagination.limit
          );
          if (result && result.videos) {
            setFilteredVideos(prev => [...prev, ...result.videos]);
          }
        }
      } catch (err) {
        console.error('Failed to load more videos:', err);
      } finally {
        // Update display count to show all videos loaded so far
        setDisplayCount(prev => prev + pagination.limit);
      }
    }
  };

  // Update display count when pagination changes
  useEffect(() => {
    // When new videos are loaded, update the display count to show them
    if (filteredVideos.length > displayCount) {
      setDisplayCount(filteredVideos.length);
    }
  }, [pagination, filteredVideos.length]);
  
  // Only show videos up to the current display count
  const visibleVideos = filteredVideos.slice(0, displayCount);
  
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
  
  // Section animation variants
  const sectionVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div 
      className="container mx-auto px-6 pt-6 pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Library Section */}
      <motion.section variants={sectionVariants}>
        <div className="flex items-center gap-3 mb-4">
          <FilmIcon className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-semibold">Your Library</h2>
        </div>
        
        <div className="mb-6">
          {isLoadingTags ? (
            <div className="h-12 flex items-center">
              <div className="animate-pulse w-64 h-8 bg-secondary/50 rounded-full"></div>
            </div>
          ) : (
            <CategoryPills
              categories={topTags}
              activeCategory={selectedCategory}
              onChange={handleCategoryChange}
            />
          )}
        </div>
        
        {isLoading && visibleVideos.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="video-card animate-pulse">
                <div className="thumbnail-container bg-secondary/50"></div>
                <div className="video-info">
                  <div className="h-5 w-3/4 bg-secondary/50 rounded mb-2"></div>
                  <div className="h-4 w-1/2 bg-secondary/30 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : visibleVideos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleVideos.map(video => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
            
            {/* Load More Button */}
            {(filteredVideos.length > visibleVideos.length || pagination.hasMore) && (
              <div className="mt-10 flex justify-center">
                <motion.button
                  className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-text-primary rounded-lg flex items-center gap-2"
                  onClick={handleLoadMore}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin"></span>
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </motion.button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
            <FilmIcon className="w-16 h-16 mb-4 opacity-30" />
            <h3 className="text-xl font-medium mb-2">No videos found</h3>
            <p className="text-center max-w-md">
              {videos.length === 0 
                ? "Your library is empty. Download some videos to get started!"
                : `No videos found with the tag "${selectedCategory}". Try selecting a different category.`}
            </p>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
};

export default Home;