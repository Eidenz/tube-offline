import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import DownloadModal from '../downloads/DownloadModal';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="h-header fixed top-0 left-0 w-full flex items-center justify-between px-6 z-40 bg-transparent">
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
            className="search-input bg-secondary/60 backdrop-blur-sm focus:bg-secondary/80 transition-all"
          />
          <button type="submit" className="search-button bg-secondary/60 backdrop-blur-sm hover:bg-secondary/80">
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