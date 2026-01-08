import React, { useState, useEffect, useRef } from 'react';

const ChatScreen = ({ onEndChat, onPartnerDisconnected, onSkipChat }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const messagesEndRef = useRef(null);

  const MAX_MESSAGE_LENGTH = 500;
  const MESSAGE_RATE_LIMIT = 1000;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    const trimmedMessage = inputMessage.trim();
    
    if (!trimmedMessage) {
      return;
    }
    
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      window.showToast?.(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`, 'error');
      return;
    }
    
    const now = Date.now();
    if (now - lastMessageTime < MESSAGE_RATE_LIMIT) {
      window.showToast?.('Please wait before sending another message.', 'warning');
      return;
    }
    
    setLastMessageTime(now);
    
    const newMessage = {
      text: trimmedMessage,
      sender: 'user',
      timestamp: now,
      id: now
    };
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    
    window.wsService?.send('SEND_MESSAGE', { message: trimmedMessage, messageId: now });
  };

  const handleEndChat = () => {
    window.wsService?.send('END_CHAT');
    onEndChat();
  };

  const handleSkipChat = () => {
    window.wsService?.send('END_CHAT');
    onSkipChat();
  };

  const addMessage = (message, sender = 'partner') => {
    const newMessage = {
      text: message,
      sender,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const removeMessage = (messageId) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  useEffect(() => {
    window.addChatMessage = addMessage;
    window.removeMessage = removeMessage;
    return () => {
      delete window.addChatMessage;
      delete window.removeMessage;
    };
  }, []);

  return (
    <div className="screen chat-screen">
      <div className="chat-header">
        <h2>DuoChat</h2>
        <div className="chat-buttons">
          <button className="skip-button" onClick={handleSkipChat}>
            Skip to Next
          </button>
          <button className="end-chat-button" onClick={handleEndChat}>
            End Chat
          </button>
        </div>
      </div>
      
      <div className="messages-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <p>You're connected! Say hello to start the conversation.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.sender === 'user' ? 'user-message' : 'partner-message'}`}
              >
                <div className="message-content">
                  {message.text}
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <div className="input-container">
          <input
            type="text"
            autoComplete='off'
            role='presentation'
            value={inputMessage}
            onChange={(e) => {
              if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                setInputMessage(e.target.value);
              }
            }}
            placeholder="Type your message..."
            className="message-input"
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <span className="character-count">
            {inputMessage.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
        <button 
          type="submit" 
          className="send-button"
          disabled={!inputMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatScreen;
