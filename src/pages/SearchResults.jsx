import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  ArrowLeftIcon, 
  FunnelIcon, 
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useLibrary } from '../context/LibraryContext';
import VideoCard from '../components/video/VideoCard';
import CategoryPills from '../components/ui/CategoryPills';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q') || '';
  
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchType, setSearchType] = useState('all');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const { searchVideos } = useLibrary();
  
  // Search filter categories
  const searchTypes = [
    { label: 'All', value: 'all' },
    { label: 'Title', value: 'title' },
    { label: 'Channel', value: 'channel' },
    { label: 'Tags', value: 'tag' }
  ];
  
  // Perform search when query changes
  useEffect(() => {
    if (!searchQuery) {
      navigate('/');
      return;
    }
    
    const performSearch = async () => {
      setIsLoading(true);
      try {
        const data = await searchVideos(searchQuery, searchType);
        setResults(data.videos);
        setPagination(data.pagination);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    performSearch();
  }, [searchQuery, searchType, searchVideos, navigate]);
  
  // Load more results
  const loadMoreResults = async () => {
    if (pagination.hasMore && !isLoading) {
      setIsLoading(true);
      try {
        const data = await searchVideos(
          searchQuery, 
          searchType, 
          pagination.limit, 
          pagination.offset + pagination.limit
        );
        
        setResults(prev => [...prev, ...data.videos]);
        setPagination(data.pagination);
      } catch (err) {
        console.error('Failed to load more results:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Handle search type change
  const handleSearchTypeChange = (type) => {
    setSearchType(type);
  };
  
  // Go back to the previous page
  const goBack = () => {
    navigate(-1);
  };
  
  // Clear search
  const clearSearch = () => {
    navigate('/');
  };
  
  // Toggle filters panel
  const toggleFilters = () => {
    setIsFilterOpen(!isFilterOpen);
  };
  
  // Page animation
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0 }
  };
  
  return (
    <motion.div
      className="container mx-auto px-6 pt-6 pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="mb-8">
        <button
          className="text-text-secondary hover:text-text-primary transition-colors mb-4"
          onClick={goBack}
          aria-label="Go back"
        >
          <div className="flex items-center gap-1">
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back</span>
          </div>
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            <MagnifyingGlassIcon className="w-7 h-7 text-accent mt-1" />
            <div>
              <h1 className="text-2xl font-bold">Search Results</h1>
              <p className="text-text-secondary">
                Results for "{searchQuery}"
                {pagination.total > 0 && ` (${pagination.total} found)`}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              className={`flex items-center gap-1 btn btn-outline ${isFilterOpen ? 'bg-hover' : ''}`}
              onClick={toggleFilters}
            >
              <FunnelIcon className="w-5 h-5" />
              Filter
            </button>
            
            <button
              className="btn btn-outline flex items-center gap-1"
              onClick={clearSearch}
            >
              <XMarkIcon className="w-5 h-5" />
              Clear
            </button>
          </div>
        </div>
        
        {/* Search filters */}
        {isFilterOpen && (
          <motion.div
            className="mt-4 bg-secondary rounded-lg p-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3 className="font-medium mb-2">Filter by:</h3>
            <CategoryPills
              categories={searchTypes}
              activeCategory={searchType}
              onChange={handleSearchTypeChange}
            />
          </motion.div>
        )}
      </div>
      
      {isLoading && results.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
          
          {/* Load more button */}
          {pagination.hasMore && (
            <div className="flex justify-center mt-8">
              <motion.button
                className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-text-primary rounded-lg flex items-center gap-2"
                onClick={loadMoreResults}
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
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary bg-secondary/30 rounded-lg">
          <MagnifyingGlassIcon className="w-16 h-16 mb-4 opacity-30" />
          <h3 className="text-xl font-medium mb-2">No results found</h3>
          <p className="text-center max-w-md mb-6">
            We couldn't find any videos matching "{searchQuery}".
            {searchType !== 'all' && " Try changing your filter or search for something else."}
          </p>
          <Link
            to="/"
            className="btn btn-primary"
          >
            Browse Library
          </Link>
        </div>
      )}
    </motion.div>
  );
};

export default SearchResults;