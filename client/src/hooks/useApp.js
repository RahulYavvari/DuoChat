import { useState, useCallback } from 'react';

export const useApp = () => {
  const [screen, setScreen] = useState('start');

  const navigateToChat = useCallback(() => {
    setScreen('chat');
  }, []);

  const navigateToStart = useCallback(() => {
    setScreen('start');
  }, []);

  return {
    screen,
    setScreen,
    navigateToChat,
    navigateToStart
  };
};