import React from 'react';

const StartScreen = ({ onStartSearch, isSearching, onStopSearch }) => {
  return (
    <div className="screen">
      <div className="container">
        <h1>DuoChat</h1>
        <p className="subtitle">Connect with strangers anonymously</p>
        
        {!isSearching ? (
          <div className="start-section">
            <button 
              className="primary-button"
              onClick={onStartSearch}
            >
              Start Chatting
            </button>
            <p className="info-text">
              Click to start looking for a random stranger to chat with
            </p>
          </div>
        ) : (
          <div className="searching-section">
            <div className="searching-indicator">
              <div className="spinner"></div>
              <p>Looking for someone to chat with...</p>
            </div>
            <button 
              className="secondary-button"
              onClick={onStopSearch}
            >
              Stop Searching
            </button>
          </div>
        )}
        
        <div className="rules">
          <h3>Rules:</h3>
          <ul>
            <li>Be respectful to others</li>
            <li>No inappropriate content</li>
            <li>You can end the chat anytime</li>
            <li>All chats are anonymous</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
