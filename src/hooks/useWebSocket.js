import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for WebSocket connection
 * @param {string} url WebSocket URL
 * @param {Function} onMessage Message handler
 * @param {Function} onOpen Connection open handler
 * @param {Function} onClose Connection close handler
 * @param {Function} onError Error handler
 * @returns {Object} WebSocket utilities
 */
const useWebSocket = (
  url,
  onMessage = () => {},
  onOpen = () => {},
  onClose = () => {},
  onError = () => {}
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  // Connect to WebSocket
  useEffect(() => {
    // Create WebSocket connection
    const wsUrl = url.startsWith('ws') ? url : `ws://${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    // Connection opened
    socket.addEventListener('open', (event) => {
      setIsConnected(true);
      setError(null);
      onOpen(event);
    });

    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
        onMessage(event.data);
      }
    });

    // Connection closed
    socket.addEventListener('close', (event) => {
      setIsConnected(false);
      onClose(event);
    });

    // Connection error
    socket.addEventListener('error', (event) => {
      setError('WebSocket connection error');
      onError(event);
    });

    // Clean up on unmount
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [url, onMessage, onOpen, onClose, onError]);

  // Send message through WebSocket
  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
      return true;
    }
    return false;
  }, []);

  // Close WebSocket connection
  const closeConnection = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
    closeConnection
  };
};

export default useWebSocket;