import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import DownloadModal from '../downloads/DownloadModal';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  // Track scroll position
  useEffect(() => {
    // Attach the scroll event to the main content element
    const mainContent = document.querySelector('main');
    
    if (!mainContent) return;
    
    const handleScroll = () => {
      if (mainContent.scrollTop > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Add the event listener to the main content
    mainContent.addEventListener('scroll', handleScroll);
    
    // Run once to check initial state
    handleScroll();
    
    return () => {
      if (mainContent) {
        mainContent.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header 
      className={`h-header fixed top-0 left-0 w-full flex items-center justify-between px-6 z-40 transition-all duration-300 ${
        isScrolled ? 'bg-secondary/95 backdrop-blur-sm shadow-header' : 'bg-transparent'
      }`}
    >
      {/* Empty div to balance the header (where sidebar toggle used to be) */}
      <div className="w-10"></div>
      
      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-xl mx-4">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Search your offline library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`search-input transition-all ${
              isScrolled ? 'bg-primary/80' : 'bg-secondary/60 backdrop-blur-sm'
            }`}
          />
          <button 
            type="submit" 
            className={`search-button transition-all ${
              isScrolled ? 'bg-primary/80' : 'bg-secondary/60 backdrop-blur-sm'
            }`}
          >
            <MagnifyingGlassIcon className="w-5 h-5 mx-auto" />
          </button>
        </div>
      </form>
      
      {/* Download button */}
      <motion.button
        className="relative flex items-center justify-center w-10 h-10 bg-accent/80 backdrop-blur-sm text-white rounded-full"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsDownloadModalOpen(true)}
        aria-label="Download video"
      >
        <ArrowDownTrayIcon className="w-5 h-5" />
      </motion.button>
      
      {/* Download Modal */}
      {isDownloadModalOpen && (
        <DownloadModal 
          isOpen={isDownloadModalOpen} 
          onClose={() => setIsDownloadModalOpen(false)} 
        />
      )}
    </header>
  );
};

export default Header;