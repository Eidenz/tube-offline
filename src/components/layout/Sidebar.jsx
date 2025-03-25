import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, memo } from 'react';
import { 
  FilmIcon, 
  ArrowDownTrayIcon, 
  QueueListIcon,
  TagIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { FilmIcon as FilmIconSolid, 
  ArrowDownTrayIcon as ArrowDownTrayIconSolid, 
  QueueListIcon as QueueListIconSolid, 
  TagIcon as TagIconSolid,
  HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useDownload } from '../../context/DownloadContext';

// Memoized NavItem component to prevent unnecessary re-renders
const NavItem = memo(({ to, icon, activeIcon, label, badge = null, isCollapsed }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => 
      `sidebar-item group ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center' : ''}`
    }
  >
    {({ isActive }) => (
      <>
        <div className="relative">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`transition-colors ${isActive ? 'text-accent' : 'text-text-secondary group-hover:text-white'}`}
          >
            {isActive ? activeIcon : icon}
          </motion.div>
          
          {badge && badge > 0 && (
            <motion.div 
              className="absolute -top-1 -right-1 bg-accent text-white text-xs w-4 h-4 flex items-center justify-center rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              {badge}
            </motion.div>
          )}
        </div>
        
        {!isCollapsed && (
          <span className={`font-medium transition-colors ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
            {label}
          </span>
        )}
      </>
    )}
  </NavLink>
));

// The main Sidebar component
const Sidebar = ({ isOpen }) => {
  // Use a ref to track the download count rather than state to avoid re-renders
  const downloadCountRef = useRef(0);
  // Use state only for forcing a re-render when necessary
  const [downloadCount, setDownloadCount] = useState(0);
  // Add state for collapsed sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Create a separate effect for monitoring active downloads
  // This will run outside the render cycle
  useEffect(() => {
    // Set up an interval to check for changes in download count
    const intervalId = setInterval(() => {
      // Import and use the function directly to avoid re-renders
      const fetchActiveDownloads = async () => {
        try {
          const response = await fetch('/api/download/active');
          const data = await response.json();
          const newCount = data.length || 0;
          
          // Only update state if the count has changed
          if (newCount !== downloadCountRef.current) {
            downloadCountRef.current = newCount;
            setDownloadCount(newCount);
          }
        } catch (error) {
          console.error('Error fetching download count:', error);
        }
      };
      
      fetchActiveDownloads();
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Toggle collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  const sidebarVariants = {
    open: { 
      width: isCollapsed ? 80 : 240, 
      opacity: 1 
    },
    closed: { 
      width: 0, 
      opacity: 0 
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="bg-secondary h-screen overflow-hidden shadow-xl relative z-50"
          initial="closed"
          animate="open"
          exit="closed"
          variants={sidebarVariants}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="flex flex-col h-full">
            {/* Toggle collapse button */}
            <div className="flex justify-end pt-4 pr-4">
              <button 
                onClick={toggleCollapsed}
                className="p-2 rounded-full bg-secondary/80 hover:bg-accent/20 text-text-secondary hover:text-accent transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="w-5 h-5" />
                ) : (
                  <ChevronLeftIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Main navigation */}
            <div className="flex-1 overflow-y-auto pt-2 pb-4 px-4 sidebar-content">
              <div className="space-y-1">
                <NavItem 
                  to="/" 
                  icon={<FilmIcon className="w-6 h-6" />}
                  activeIcon={<FilmIconSolid className="w-6 h-6" />}
                  label="Library" 
                  isCollapsed={isCollapsed}
                />

                <NavItem 
                  to="/favorites" 
                  icon={<HeartIcon className="w-6 h-6" />}
                  activeIcon={<HeartIconSolid className="w-6 h-6" />}
                  label="Favorites" 
                  isCollapsed={isCollapsed}
                />
                
                <NavItem 
                  to="/downloads" 
                  icon={<ArrowDownTrayIcon className="w-6 h-6" />}
                  activeIcon={<ArrowDownTrayIconSolid className="w-6 h-6" />}
                  label="Downloads" 
                  badge={downloadCount || null}
                  isCollapsed={isCollapsed}
                />
                
                <NavItem 
                  to="/playlists" 
                  icon={<QueueListIcon className="w-6 h-6" />}
                  activeIcon={<QueueListIconSolid className="w-6 h-6" />}
                  label="Playlists" 
                  isCollapsed={isCollapsed}
                />
                
                <NavItem 
                  to="/tags" 
                  icon={<TagIcon className="w-6 h-6" />}
                  activeIcon={<TagIconSolid className="w-6 h-6" />}
                  label="Tags" 
                  isCollapsed={isCollapsed}
                />
              </div>
            </div>
            
            {/* Bottom section with version info */}
            {!isCollapsed && (
              <div className="pt-4 pb-6 px-6 text-xs text-text-secondary/50 border-t border-[#3f3f3f]/30">
                <p>TubeOffline v1</p>
              </div>
            )}
          </div>
          
          {/* Right edge glow effect */}
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-r from-transparent to-accent/10" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;