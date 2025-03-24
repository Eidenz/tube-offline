import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FilmIcon } from '@heroicons/react/24/outline';
import { useLibrary } from '../context/LibraryContext';
import VideoCard from '../components/video/VideoCard';
import CategoryPills from '../components/ui/CategoryPills';
import { useInView } from 'react-intersection-observer';
import axios from 'axios';

const Home = () => {
  const { videos, fetchVideos, pagination, isLoading, searchVideos, getTopTags } = useLibrary();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [topTags, setTopTags] = useState([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  
  // Setup intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
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
  
  // Load more videos when the user scrolls to the bottom
  useEffect(() => {
    if (inView && pagination.hasMore && !isLoading) {
      if (selectedCategory === 'all') {
        fetchVideos(pagination.limit, pagination.offset + pagination.limit);
      } else {
        // If a tag is selected, we need to search for more videos with that tag
        searchVideos(
          selectedCategory, 
          'tag',
          pagination.limit, 
          pagination.offset + pagination.limit
        ).then(result => {
          if (result && result.videos) {
            setFilteredVideos(prev => [...prev, ...result.videos]);
          }
        });
      }
    }
  }, [inView, pagination, isLoading, fetchVideos, selectedCategory, searchVideos]);
  
  // Filter videos based on selected category/tag
  useEffect(() => {
    const filterByTag = async () => {
      if (selectedCategory === 'all') {
        setFilteredVideos(videos);
      } else {
        setIsLoading(true);
        try {
          // Use searchVideos to filter by the selected tag
          const result = await searchVideos(selectedCategory, 'tag');
          if (result && result.videos) {
            setFilteredVideos(result.videos);
          } else {
            setFilteredVideos([]);
          }
        } catch (err) {
          console.error('Failed to filter by tag:', err);
          setFilteredVideos([]);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    filterByTag();
  }, [selectedCategory, videos, searchVideos]);
  
  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
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
        
        {isLoading && filteredVideos.length === 0 ? (
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
        ) : filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
            <FilmIcon className="w-16 h-16 mb-4 opacity-30" />
            <h3 className="text-xl font-medium mb-2">No videos found</h3>
            <p className="text-center max-w-md">
              {videos.length === 0 
                ? "Your library is empty. Download some videos to get started!"
                : `No videos found with the tag "${selectedCategory}". Try selecting a different category.`}
            </p>
          </div>
        )}
        
        {/* Loading more indicator */}
        {pagination.hasMore && !isLoading && (
          <div 
            ref={ref}
            className="flex justify-center items-center py-8"
          >
            <div className="animate-pulse w-8 h-8 bg-accent/20 rounded-full"></div>
          </div>
        )}
        
        {/* Loading indicator while fetching more */}
        {isLoading && filteredVideos.length > 0 && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
};

export default Home;