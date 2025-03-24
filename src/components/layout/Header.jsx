import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bars3Icon, XMarkIcon, MagnifyingGlassIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import DownloadModal from '../downloads/DownloadModal';

const Header = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const toggleSidebarVisibility = () => {
    setIsSidebarVisible(!isSidebarVisible);
    toggleSidebar();
  };

  return (
    <header className="h-header bg-secondary fixed top-0 left-0 w-full flex items-center justify-between px-6 z-50 shadow-header">
      <div className="flex items-center">
        <button
          onClick={toggleSidebarVisibility}
          className="mr-4 text-text-primary hover:text-accent transition-colors"
          aria-label="Toggle sidebar"
        >
          {isSidebarVisible ? (
            <Bars3Icon className="w-6 h-6" />
          ) : (
            <XMarkIcon className="w-6 h-6" />
          )}
        </button>
        
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <motion.div
            initial={{ rotate: 0 }}
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className="text-accent"
          >
            <ArrowDownTrayIcon className="w-6 h-6" />
          </motion.div>
          <span>TubeOffline</span>
        </Link>
      </div>
      
      <form onSubmit={handleSubmit} className="flex-1 max-w-xl mx-6">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Search your offline library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            <MagnifyingGlassIcon className="w-5 h-5 mx-auto" />
          </button>
        </div>
      </form>
      
      <div className="flex items-center gap-6">
        <motion.button
          className="relative flex items-center justify-center w-10 h-10 bg-accent/10 text-accent rounded-full"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDownloadModalOpen(true)}
          aria-label="Download video"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
        </motion.button>
        
        <motion.button
          className="text-text-primary"
          whileHover={{ rotate: 45, scale: 1.1 }}
          transition={{ duration: 0.2 }}
          aria-label="Settings"
        >
          <Cog6ToothIcon className="w-6 h-6" />
        </motion.button>
      </div>
      
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