import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const KeyboardControlsHelp = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Function to show keyboard help when '?' key is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      
      // Check if the key pressed is '?' (with or without shift)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault(); // Prevent default browser behavior
        setIsVisible(prev => !prev); // Toggle visibility
      }
      
      // Also close with Escape key
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible]);
  
  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  
  const contentVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", damping: 25, stiffness: 300 }
    }
  };
  
  // Keyboard shortcuts grouped by function
  const keyboardShortcuts = {
    'Application Controls': [
      { key: '/', description: 'Focus search' },
      { key: '?', description: 'Show/Hide keyboard shortcuts' }
    ],
    'Video Playback': [
      { key: 'Space / K', description: 'Play/Pause' },
      { key: '←  / J', description: 'Rewind 5 seconds' },
      { key: '→ / L', description: 'Forward 5 seconds' },
      { key: 'Shift + ←', description: 'Rewind 10 seconds' },
      { key: 'Shift + →', description: 'Forward 10 seconds' },
      { key: 'Home', description: 'Go to start of video' },
      { key: 'End', description: 'Go to end of video' }
    ],
    'Volume Controls': [
      { key: '↑', description: 'Increase volume' },
      { key: '↓', description: 'Decrease volume' },
      { key: 'M', description: 'Mute/Unmute' }
    ],
    'Display': [
      { key: 'F', description: 'Toggle fullscreen' }
    ]
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={() => setIsVisible(false)}
        >
          <motion.div
            className="bg-secondary rounded-xl w-full max-w-lg shadow-xl overflow-hidden"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-[#3f3f3f]">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 text-accent" />
                Keyboard Shortcuts
              </h2>
              <button
                className="text-text-primary hover:text-accent transition-colors"
                onClick={() => setIsVisible(false)}
                aria-label="Close"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {/* Render shortcuts by category */}
              {Object.entries(keyboardShortcuts).map(([category, shortcuts], categoryIndex) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-semibold mb-3 text-accent">{category}</h3>
                  <div className="grid gap-2">
                    {shortcuts.map((shortcut, index) => (
                      <motion.div 
                        key={`${category}-${index}`}
                        className="grid grid-cols-2 bg-primary rounded-lg p-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          transition: { delay: (categoryIndex * 0.1) + (index * 0.03) }
                        }}
                      >
                        <div className="flex items-center">
                          <kbd className="px-2 py-1 bg-secondary rounded text-sm font-mono shadow-sm">
                            {shortcut.key}
                          </kbd>
                        </div>
                        <div className="text-text-secondary">
                          {shortcut.description}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="mt-6 text-sm text-text-secondary text-center">
                Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">?</kbd> anytime to show these shortcuts
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KeyboardControlsHelp;