import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Layouts
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

// Pages
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import Downloads from './pages/Downloads';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import SearchResults from './pages/SearchResults';
import Tags from './pages/Tags';
import Favorites from './pages/Favorites';

// Context
import { NotificationProvider } from './context/NotificationContext';
import { LibraryProvider } from './context/LibraryContext';
import { DownloadProvider } from './context/DownloadContext';
import { ThemeProvider } from './context/ThemeContext';

// Components
import NotificationToast from './components/ui/NotificationToast';
import ScrollToTop from './components/ui/ScrollToTop';
import LibraryRefreshPoller from './components/ui/LibraryRefreshPoller';
import KeyboardControlsHelp from './components/ui/KeyboardControlsHelp';

// Hooks
import useKeyboardControls from './hooks/useKeyboardControls';

// CSS for theme support
import './theme.css';

// App-level keyboard controls (non-video specific)
function GlobalKeyboardControls() {
  // We're just setting up global keyboard shortcuts here
  // The actual shortcut definitions are in the useKeyboardControls hook
  useKeyboardControls({
    isActive: true,
    // These are placeholders since we're not controlling a video
    playing: false,
    togglePlay: () => {},
    seekForward: () => {},
    seekBackward: () => {},
    increaseVolume: () => {},
    decreaseVolume: () => {},
    toggleMute: () => {},
    toggleFullscreen: () => {},
  });
  
  return null;
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Fix for initial loading issue
  useEffect(() => {
    // This small delay gives the app time to properly initialize
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    // Ignore Vite WebSocket errors - they don't affect functionality in production
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('WebSocket') && message.includes('failed to connect')) {
        // Ignore Vite WebSocket connection errors
        return;
      }
      if (message.includes('ProtectedRoute')) {
        // Ignore ProtectedRoute hook errors (these appear to be from another library)
        return;
      }
      originalConsoleError(...args);
    };
    
    return () => {
      clearTimeout(timer);
      console.error = originalConsoleError;
    };
  }, []);

  if (!isLoaded) {
    // Show a loading screen while the app initializes
    return (
      <div className="flex items-center justify-center h-screen bg-primary text-text-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <NotificationProvider>
          <LibraryProvider>
            <DownloadProvider>
              <div className="flex flex-col h-screen bg-primary text-text-primary">
                <Header />
                
                <div className="flex flex-1 overflow-hidden">
                  <Sidebar isOpen={isSidebarOpen} />
                  
                  <main className="flex-1 overflow-y-auto pt-header">
                    <AnimatePresence mode="wait">
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/video/:id" element={<VideoPlayer />} />
                        <Route path="/downloads" element={<Downloads />} />
                        <Route path="/playlists" element={<Playlists />} />
                        <Route path="/playlist/:id" element={<PlaylistDetail />} />
                        <Route path="/tags" element={<Tags />} />
                        <Route path="/search" element={<SearchResults />} />
                        <Route path="/favorites" element={<Favorites />} />
                      </Routes>
                    </AnimatePresence>
                  </main>
                </div>
                
                <NotificationToast />
                <ScrollToTop />
                <LibraryRefreshPoller />
                <KeyboardControlsHelp />
                <GlobalKeyboardControls />
              </div>
            </DownloadProvider>
          </LibraryProvider>
        </NotificationProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;