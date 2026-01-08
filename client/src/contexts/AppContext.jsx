import React, { createContext, useContext } from 'react';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { useApp } from '../hooks/useApp.js';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const webSocketState = useWebSocket();
  const appState = useApp();

  React.useEffect(() => {
    if (webSocketState.chatId && !webSocketState.isSearching) {
      appState.navigateToChat();
    }
  }, [webSocketState.chatId, webSocketState.isSearching, appState]);

  React.useEffect(() => {
    if (!webSocketState.chatId && appState.screen === 'chat') {
      appState.navigateToStart();
    }
  }, [webSocketState.chatId, appState.screen, appState]);

  const handleChatEnded = () => {
    appState.navigateToStart();
  };

  const handlePartnerDisconnected = () => {
    appState.navigateToStart();
  };

  return (
    <AppContext.Provider
      value={{
        ...webSocketState,
        ...appState,
        handleChatEnded,
        handlePartnerDisconnected
      }}
    >
      {children}
    </AppContext.Provider>
  );
};