import { useState, useEffect, useCallback } from 'react';
import { wsService } from '../services/websocket.js';
import { StorageService } from '../services/storage.js';
import { debounce } from '../utils/debounce.js';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userId, setUserId] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const attemptConnectionWithRetry = useCallback(async (attempt = 1) => {
    const maxAttempts = 3;
    const delay = attempt * 2000;

    try {
      await wsService.connect();
      setIsConnected(true);
    } catch (error) {
      if (attempt < maxAttempts) {
        setTimeout(() => {
          attemptConnectionWithRetry(attempt + 1);
        }, delay);
      } else {
        showToast('Unable to connect. Please refresh the page.', 'error');
      }
    }
  }, [showToast]);

  const setupWebSocketHandlers = useCallback(() => {
    window.wsService = wsService;

    wsService.on('RECONNECTED', () => {
      setIsConnected(true);
    });

    wsService.on('CONNECTED', (message) => {
      setIsConnected(true);
      if (message.payload.userId) {
        setUserId(message.payload.userId);
        StorageService.setUserId(message.payload.userId);
      }
    });

    wsService.on('SEARCHING', () => {
      setIsSearching(true);
    });

    wsService.on('MATCHED', (message) => {
      setIsSearching(false);
      setChatId(message.payload.chatId);
    });

    wsService.on('MESSAGE', (message) => {
      if (window.addChatMessage) {
        window.addChatMessage(message.payload.message, 'partner');
      }
    });

    wsService.on('CHAT_ENDED', () => {
      showToast('Chat has ended', 'info');
      setChatId(null);
      setIsSearching(false);
    });

    wsService.on('PARTNER_DISCONNECTED', () => {
      showToast('Your partner has disconnected', 'warning');
      setChatId(null);
      setIsSearching(false);
    });

    wsService.on('SEARCH_ENDED', () => {
      setIsSearching(false);
    });

    wsService.on('ERROR', (message) => {
      const errorMessage = message.payload?.message || 'An error occurred';
      
      if (errorMessage.includes('Rate limit')) {
        showToast('Too many messages', 'error');
        if (message.payload?.messageId && window.removeMessage) {
          window.removeMessage(message.payload.messageId);
        }
      } else if (errorMessage.includes('Not in chat')) {
        showToast('Not connected to a chat. Please start a new chat.', 'warning');
      } else if (errorMessage.includes('Session expired')) {
        showToast('Session expired. Please refresh the page.', 'error');
      } else {
        showToast(`Error: ${errorMessage}`, 'error');
      }
    });
  }, [showToast]);

  const initializeWebSocket = useCallback(async () => {
    const existingUserId = StorageService.getOrCreateUserId();
    setUserId(existingUserId);

    const checkTabConflict = () => {
      const currentTabId = Date.now().toString();
      sessionStorage.setItem('tabId', currentTabId);
      
      const storageListener = (e) => {
        if (e.key === 'tabId' && e.newValue !== currentTabId) {
          alert('You can only use this app in one tab at a time.');
          window.close();
        }
      };
      
      window.addEventListener('storage', storageListener);
      localStorage.setItem('activeTab', currentTabId);
      
      return () => {
        window.removeEventListener('storage', storageListener);
        localStorage.removeItem('activeTab');
      };
    };

    const cleanupTabCheck = checkTabConflict();
    setupWebSocketHandlers();

    setTimeout(() => {
      attemptConnectionWithRetry();
    }, 500);

    return cleanupTabCheck;
  }, [setupWebSocketHandlers, attemptConnectionWithRetry]);

  useEffect(() => {
    const cleanup = initializeWebSocket();
    return () => {
      cleanup?.();
      wsService.disconnect();
    };
  }, [initializeWebSocket]);

  const handleStartSearch = debounce(() => {
    if (!isConnected) {
      showToast('Connection error. Please wait...', 'error');
      return;
    }
    if (wsService) {
      wsService.send('START_SEARCH');
    }
  }, 500);

  const handleStopSearch = debounce(() => {
    if (!isConnected) {
      showToast('Connection error. Please wait...', 'error');
      return;
    }
    if (wsService) {
      wsService.send('STOP_SEARCH');
    }
  }, 500);

  const handleSkipChat = debounce(() => {
    if (!isConnected) {
      showToast('Connection error. Please wait...', 'error');
      return;
    }
    setChatId(null);
    setTimeout(() => {
      if (wsService) {
        wsService.send('START_SEARCH');
      }
    }, 100);
  }, 300);

  const handleEndChat = debounce(() => {
    if (!isConnected) {
      showToast('Connection error. Please wait...', 'error');
      return;
    }
    setChatId(null);
  }, 300);

  return {
    isConnected,
    isSearching,
    userId,
    chatId,
    toast,
    handleStartSearch,
    handleStopSearch,
    handleSkipChat,
    handleEndChat,
    setChatId
  };
};