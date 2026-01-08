import React from 'react';
import StartScreen from './components/StartScreen.jsx';
import ChatScreen from './components/ChatScreen.jsx';
import { AppProvider, useAppContext } from './contexts/AppContext.jsx';

const AppContent = () => {
  const {
    screen,
    toast,
    isSearching,
    handleStartSearch,
    handleStopSearch,
    handleEndChat,
    handlePartnerDisconnected,
    handleSkipChat,
    chatId
  } = useAppContext();

  return (
    <div className="app">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
      
      {screen === 'start' && (
        <StartScreen
          onStartSearch={handleStartSearch}
          isSearching={isSearching}
          onStopSearch={handleStopSearch}
        />
      )}
      
      {screen === 'chat' && (
        <ChatScreen
          onEndChat={handleEndChat}
          onPartnerDisconnected={handlePartnerDisconnected}
          onSkipChat={handleSkipChat}
          chatId={chatId}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
