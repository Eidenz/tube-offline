import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for handling keyboard controls in video player
 * @param {Object} options Control options
 * @param {boolean} options.playing Current playing state
 * @param {function} options.togglePlay Function to toggle play/pause
 * @param {function} options.seekForward Function to seek forward
 * @param {function} options.seekBackward Function to seek backward
 * @param {function} options.increaseVolume Function to increase volume
 * @param {function} options.decreaseVolume Function to decrease volume
 * @param {function} options.toggleMute Function to toggle mute
 * @param {function} options.toggleFullscreen Function to toggle fullscreen
 * @param {boolean} options.isActive Whether keyboard controls should be active
 * @returns {void}
 */
const useKeyboardControls = ({
  playing,
  togglePlay,
  seekForward,
  seekBackward,
  increaseVolume,
  decreaseVolume,
  toggleMute,
  toggleFullscreen,
  isActive = true,
}) => {
  const navigate = useNavigate();

  // Global application keyboard shortcuts (available across the app)
  const handleGlobalKeyDown = useCallback((e) => {
    // Don't trigger if user is typing in an input
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    switch (e.key) {
      case '/': // Forward slash key for search (similar to GitHub, etc.)
        if (!e.ctrlKey && !e.metaKey) { // Not part of a keyboard shortcut
          e.preventDefault();
          // Focus the search input
          const searchInput = document.querySelector('.search-input');
          if (searchInput) {
            searchInput.focus();
          }
        }
        break;

      case 'Escape':
        // If any modal is open, this would typically close it
        // For fullscreen specifically, most browsers already handle ESC
        break;

      default:
        // No default action for global shortcuts
        break;
    }
  }, [navigate]);

  // Video player specific keyboard shortcuts
  const handleVideoKeyDown = useCallback((e) => {
    // If controls are not active or user is typing in an input, don't handle keyboard shortcuts
    if (!isActive || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    // Prevent default for all handled keys to avoid scrolling, etc.
    switch (e.key) {
      case ' ': // Space
      case 'k': // YouTube-style play/pause
        e.preventDefault();
        togglePlay();
        break;
      
      case 'ArrowRight':
      case 'l': // YouTube-style seek forward
        e.preventDefault();
        seekForward(e.shiftKey ? 10 : 5); // 5 seconds, or 10 with Shift
        break;
      
      case 'ArrowLeft':
      case 'j': // YouTube-style seek backward
        e.preventDefault();
        seekBackward(e.shiftKey ? 10 : 5); // 5 seconds, or 10 with Shift
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        increaseVolume(0.05); // Increase volume by 5%
        break;
      
      case 'ArrowDown':
        e.preventDefault();
        decreaseVolume(0.05); // Decrease volume by 5%
        break;
      
      case 'm': // Mute/unmute
        e.preventDefault();
        toggleMute();
        break;
      
      case 'f': // Fullscreen
        e.preventDefault();
        toggleFullscreen();
        break;
      
      // These are other common media keys that could be supported
      case 'Home': // Go to start
        e.preventDefault();
        seekBackward(Infinity);
        break;
        
      case 'End': // Go to end
        e.preventDefault();
        seekForward(Infinity);
        break;

      default:
        // Do nothing for other keys
        break;
    }
  }, [
    isActive, 
    togglePlay, 
    seekForward, 
    seekBackward, 
    increaseVolume, 
    decreaseVolume, 
    toggleMute, 
    toggleFullscreen
  ]);

  useEffect(() => {
    // Always register global shortcuts
    window.addEventListener('keydown', handleGlobalKeyDown);
    
    // Only register video controls if they're provided and active
    if (isActive && togglePlay) {
      window.addEventListener('keydown', handleVideoKeyDown);
    }

    // Clean up event listeners
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (isActive && togglePlay) {
        window.removeEventListener('keydown', handleVideoKeyDown);
      }
    };
  }, [handleGlobalKeyDown, handleVideoKeyDown, isActive, togglePlay]);

  // This hook doesn't return anything, it just sets up the event listeners
  return null;
};

export default useKeyboardControls;