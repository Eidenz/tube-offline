import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TagIcon, ChevronRightIcon, ArrowsPointingOutIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { useLibrary } from '../context/LibraryContext';
import { useNotification } from '../context/NotificationContext';

const Tags = () => {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(80); // Display first 80 tags initially
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const navigate = useNavigate();
  
  const { fetchTags } = useLibrary();
  const { error } = useNotification();
  
  // Color palette for tags
  const colors = [
    { bg: 'bg-blue-500/20', text: 'text-blue-400', hover: 'hover:bg-blue-500/30' },
    { bg: 'bg-green-500/20', text: 'text-green-400', hover: 'hover:bg-green-500/30' },
    { bg: 'bg-purple-500/20', text: 'text-purple-400', hover: 'hover:bg-purple-500/30' },
    { bg: 'bg-orange-500/20', text: 'text-orange-400', hover: 'hover:bg-orange-500/30' },
    { bg: 'bg-pink-500/20', text: 'text-pink-400', hover: 'hover:bg-pink-500/30' },
    { bg: 'bg-teal-500/20', text: 'text-teal-400', hover: 'hover:bg-teal-500/30' },
    { bg: 'bg-red-500/20', text: 'text-red-400', hover: 'hover:bg-red-500/30' },
    { bg: 'bg-yellow-500/20', text: 'text-yellow-400', hover: 'hover:bg-yellow-500/30' },
    { bg: 'bg-indigo-500/20', text: 'text-indigo-400', hover: 'hover:bg-indigo-500/30' },
    { bg: 'bg-cyan-500/20', text: 'text-cyan-400', hover: 'hover:bg-cyan-500/30' },
  ];
  
  // Assign a consistent color to each tag based on its name
  const getTagColor = (tagName) => {
    // Simple hash function to get a consistent index for each tag name
    const hash = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };
  
  // Fetch tags on mount
  useEffect(() => {
    const loadTags = async () => {
      setIsLoading(true);
      try {
        const tagData = await fetchTags();
        if (tagData) {
          // Sort tags by video count (descending)
          const sortedTags = [...tagData].sort((a, b) => b.video_count - a.video_count);
          setTags(sortedTags);
        }
      } catch (err) {
        console.error('Failed to fetch tags:', err);
        error('Failed to load tags');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTags();
  }, [fetchTags, error]);
  
  // Filter tags based on search query
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get tags to display based on displayCount
  const visibleTags = filteredTags.slice(0, displayCount);
  
  // Load more tags
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    
    // Simulate loading with a short delay for better UX
    setTimeout(() => {
      setDisplayCount(prevCount => prevCount + 80);
      setIsLoadingMore(false);
    }, 300);
  };
  
  // Handle tag click
  const handleTagClick = (tag) => {
    setSelectedTag(tag);
  };
  
  // Navigate to search results with the selected tag
  const handleViewVideos = () => {
    if (selectedTag) {
      navigate(`/search?q=${encodeURIComponent(selectedTag.name)}&type=tag`);
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
  
  // Load more button variants
  const loadMoreVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    hover: { scale: 1.05 }
  };
  
  return (
    <motion.div
      className="container mx-auto px-6 pt-6 pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <TagIcon className="w-7 h-7 text-accent" />
          <h1 className="text-2xl font-bold">Tags</h1>
        </div>
        
        {/* Search input */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 px-4 pl-10 bg-secondary border border-[#3f3f3f] text-text-primary rounded-lg text-base outline-none transition-all focus:border-accent"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tags Cloud */}
        <motion.div 
          className="flex-1 bg-secondary/20 rounded-xl p-6 min-h-[400px]"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">All Tags</h2>
            {filteredTags.length > 0 && (
              <span className="text-sm text-text-secondary">
                Showing {Math.min(visibleTags.length, filteredTags.length)} of {filteredTags.length} tags
              </span>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : filteredTags.length > 0 ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                {visibleTags.map((tag) => {
                  const colorSet = getTagColor(tag.name);
                  return (
                    <motion.button
                      key={tag.id}
                      className={`px-4 py-2 rounded-full flex items-center gap-1 transition-colors ${colorSet.bg} ${colorSet.text} ${colorSet.hover} ${selectedTag?.id === tag.id ? 'ring-2 ring-white/30' : ''}`}
                      onClick={() => handleTagClick(tag)}
                      variants={itemVariants}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>{tag.name}</span>
                      <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                        {tag.video_count}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              
              {/* Load More Button - only show if there are more tags to load */}
              {filteredTags.length > visibleTags.length && (
                <div className="flex justify-center pt-4">
                  <motion.button
                    className="btn btn-outline flex items-center gap-2"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    variants={loadMoreVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="w-5 h-5 border-2 border-text-primary border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <ArrowDownIcon className="w-5 h-5" />
                        Load {Math.min(80, filteredTags.length - visibleTags.length)} More Tags
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
              <TagIcon className="w-16 h-16 mb-4 opacity-30" />
              <h3 className="text-xl font-medium mb-2">No tags found</h3>
              <p className="text-center max-w-md">
                {tags.length === 0 
                  ? "No tags available. Start downloading videos with tags to populate this section."
                  : "No tags match your search criteria."}
              </p>
            </div>
          )}
        </motion.div>
        
        {/* Selected Tag Details */}
        <div className="lg:w-72 xl:w-96">
          {selectedTag ? (
            <motion.div 
              className="bg-secondary/30 rounded-xl p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Tag Details</h2>
                <button
                  className="text-text-secondary hover:text-text-primary transition-colors"
                  onClick={() => setSelectedTag(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <div className={`inline-block px-4 py-2 rounded-full mb-4 ${getTagColor(selectedTag.name).bg} ${getTagColor(selectedTag.name).text}`}>
                  {selectedTag.name}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-text-secondary mb-1">Videos with this tag</div>
                    <div className="text-2xl font-semibold">{selectedTag.video_count}</div>
                  </div>
                </div>
              </div>
              
              <button
                className="w-full btn btn-primary flex items-center justify-center gap-2"
                onClick={handleViewVideos}
                disabled={selectedTag.video_count === 0}
              >
                <span>View Videos</span>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              className="bg-secondary/30 rounded-xl p-6 flex flex-col items-center justify-center h-72 text-text-secondary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TagIcon className="w-12 h-12 mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2 text-center">Select a tag to view details</h3>
              <p className="text-center text-sm mb-4">
                Click on any tag to see more information and related videos.
              </p>
              <ArrowsPointingOutIcon className="w-6 h-6 opacity-20" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Tags;