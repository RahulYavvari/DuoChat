# DuoChat Client

A simple React client for the anonymous chat WebSocket server.

## Features

- Anonymous random chat matching
- Real-time messaging via WebSocket
- Local storage user ID management
- Single tab enforcement
- Simple, clean UI with plain CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update the WebSocket URL in `src/services/websocket.js`:
```javascript
const WS_URL = 'wss://your-actual-websocket-endpoint/dev';
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## How it Works

### User Management
- Generates a unique user ID on first visit
- Stores user ID in localStorage
- Prevents multiple tabs from using the same user ID

### WebSocket Communication

**Client Actions:**
- `START_SEARCH` - Begin looking for chat partners
- `STOP_SEARCH` - Stop searching
- `SEND_MESSAGE` - Send chat message
- `END_CHAT` - End current chat

**Server Messages:**
- `CONNECTED` - Connection established
- `SEARCHING` - Currently looking for matches
- `MATCHED` - Found a chat partner
- `MESSAGE` - Received message from partner
- `CHAT_ENDED` - Chat session ended
- `PARTNER_DISCONNECTED` - Partner left the chat
- `ERROR` - Server error occurred

### Flow

1. **Start Screen** - User can start searching for matches
2. **Searching** - Shows loading spinner while looking for partners
3. **Chat Screen** - Real-time messaging with matched partner
4. **End Chat** - Returns to start screen

## File Structure

```
src/
├── components/
│   ├── StartScreen.jsx    # Initial screen with search functionality
│   └── ChatScreen.jsx     # Chat interface
├── services/
│   ├── websocket.js       # WebSocket connection management
│   └── storage.js         # Local storage utilities
├── App.jsx                # Main application component
├── main.jsx              # React entry point
└── styles.css            # Application styles
```

## Notes

- No chat persistence on client side (anonymous by design)
- Simple CSS styling without external frameworks
- WebSocket endpoint needs to be configured
- Rate limiting and message validation handled by server
