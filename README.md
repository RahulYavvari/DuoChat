# DuoChat - Anonymous Real-time Chat Platform

A modern, scalable anonymous chat application that connects strangers for real-time conversations. Built with React.js frontend and serverless AWS backend architecture.

## Live Deployment

- **Frontend**: [https://duo-chat-sand.vercel.app/](https://duo-chat-sand.vercel.app)
- **Backend**: AWS API Gateway WebSocket (ap-south-2 region) [wss://bx3n4lka6j.execute-api.ap-south-2.amazonaws.com/dev](wss://bx3n4lka6j.execute-api.ap-south-2.amazonaws.com/dev)

## Architecture Overview

![Architecture Diagram](assets/architecture-diagram.png)

### Frontend Architecture
- **React.js** with modern hooks-based architecture for state management
- **WebSocket Service** encapsulates real-time communication logic with automatic reconnection
- **Component-based UI** with minimal, functional design focused on usability
- **Custom Hooks** (`useWebSocket`, `useApp`) for reusable business logic

### Backend Architecture
- **AWS API Gateway** with WebSocket support for real-time bidirectional communication
- **AWS Lambda** functions for serverless, scalable business logic:
  - **Connect Handler**: Manages new user connections and UUID generation
  - **Message Handler**: Processes all chat actions (search, message, end chat)
  - **Disconnect Handler**: Handles cleanup and partner notifications
- **Neon PostgreSQL** with connection pooling for data persistence and concurrent operations
- **Serverless Framework** for infrastructure as code deployment and environment management

### Architecture Flow
1. **Static Assets**: Served via Vercel CDN for global performance
2. **Real-time Communication**: WebSocket connections through API Gateway
3. **Stateless Processing**: Lambda functions process each request independently
4. **Persistent Storage**: PostgreSQL maintains all application state
5. **Scalability**: Auto-scaling Lambda functions handle variable load

### Database Design
The PostgreSQL schema is optimized for concurrent matchmaking and real-time operations:

```sql
-- Core tables for user management and chat state
connections (user_id, connection_id, status, matched_with)
waiting_queue (user_id, connection_id, joined_at)
active_chats (chat_id, user1_id, user2_id, connection_ids)
message_log (user_id, sent_at, message_length) -- For rate limiting
```

**User Status States:**
- **IDLE**: User connected, not actively searching for partner
- **SEARCHING**: User actively looking for a match in waiting queue
- **CHATTING**: User matched and in active conversation

**Key Design Decisions:**
- **UUID-based user identification** for complete anonymity
- **Connection pooling** in Neon to reduce latency and improve performance
- **Database-level matchmaking function** with `FOR UPDATE SKIP LOCKED` for concurrent safety
- **Separate waiting queue** for efficient FIFO matchmaking
- **Message logging table** for rate limiting and analytics

## Matchmaking & Chat Flow

### 1. User Connection
```
Client -> WebSocket Connect -> Lambda Connect Handler
-> Generate UUID -> Store in DB -> Return User ID
```

### 2. Matchmaking Process
```
Start Search -> Add to Waiting Queue -> Database Match Function
-> Find Partner -> Create Chat Room -> Notify Both Users
```

### Matchmaking Algorithm

The matchmaking system uses a **FIFO (First-In-First-Out) queue** with **database-level atomic operations** to ensure fair and reliable partner matching:

#### Database Schema for Matchmaking
```
waiting_queue:
- user_id (primary key)
- connection_id 
- joined_at (timestamp)

active_chats:
- chat_id (primary key)
- user1_id, user2_id
- user1_connection_id, user2_connection_id
- started_at (timestamp)
```

#### Matchmaking Function Logic
```
function attempt_match(user_id, connection_id):
    find earliest user in waiting_queue (excluding current user)
    if partner found:
        create new chat session
        update both users to CHATTING status
        remove partner from waiting_queue
        return match_found
    else:
        add current user to waiting_queue
        update user status to SEARCHING
        return no_match
```

**Process:**

1. **Queue Entry**: When user starts search, they're added to `waiting_queue` with timestamp
2. **Partner Search**: Database function searches for earliest waiting user (FIFO)
3. **Atomic Matching**: Uses `FOR UPDATE SKIP LOCKED` to prevent race conditions
4. **Chat Creation**: If partner found:
   - Generate unique `chat_id`
   - Create entry in `active_chats` table
   - Update both users' status to 'CHATTING'
   - Remove partner from waiting queue
5. **No Partner**: If no partner found:
   - User remains in waiting queue
   - Status set to 'SEARCHING'

#### Key Features:
- **Concurrent Safety**: `SKIP LOCKED` prevents multiple users from matching with same partner
- **Fair Matching**: FIFO queue ensures users who waited longest get matched first
- **ACID Compliance**: All operations in single transaction prevent inconsistent states
- **Scalability**: Database-level function handles high concurrent loads
- **Randomness in FIFO**: While queue order is FIFO, randomness is achieved through:
  - **Variable arrival times**: Users join queue at random intervals
  - **Multiple concurrent searches**: Users searching simultaneously get matched based on who finds partner first
  - **Natural distribution**: Random pairing emerges from unpredictable timing of search requests
  - **No preference system**: Every waiting user has equal probability of being selected as partner

#### Error Handling:
- **Connection Failures**: Stale connections automatically cleaned up
- **Orphaned Users**: Users left in queue too long are reset to IDLE
- **Race Conditions**: Atomic operations prevent duplicate matches

### 3. Real-time Messaging
```
Send Message -> Rate Limit Check -> Forward to Partner
-> Log Message -> Update Activity Timestamp
```

### 4. Chat Termination
```
End Chat/Skip -> Clean Up Chat Room -> Reset User States
-> Notify Partner -> Return to Idle State
```

### State Management
- **Client**: React Context API with custom hooks
- **Server**: PostgreSQL database with ACID transactions
- **Real-time**: WebSocket connections with automatic reconnection

## Deployment Approach

### Frontend Deployment (Vercel)
```bash
# Automatic deployment on git push
# Environment variables:
VITE_WS_URL=wss://api-endpoint.execute-api.region.amazonaws.com/dev
VITE_ENV=dev

# Vercel - Git push to deploy
```

### Backend Deployment (Serverless Framework)
```bash
cd server
# Make sure to configure AWS credentials in AWS CLI
# Deploy to AWS
npm run deploy

# Infrastructure components:
- API Gateway WebSocket API
- 3 Lambda functions (connect, disconnect, message)
- IAM roles and policies
- Environment variables
```

### Database Setup (Neon)
```bash
# PostgreSQL with connection pooling
# Automated schema migration
# Environment variables:
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Seed database
cd server
npm run seed
```

## Known Limitations & Production Improvements

### Current Functional Limitations

1. **No preference system**
   - Users can't express preferences to match with a partner
   - **Improvement**: Add preference system for users to express their preferences for their partner

2. **Individual Message Logging**
   - Each message creates a separate DB write for rate limiting
   - **Improvement**: Implement bulk writes or Redis-based rate limiting

3. **No Message Persistence**
   - Messages are not stored after delivery
   - **Improvement**: Add message history table for chat persistence, if needed for analytics or future features

4. **Memory-based Connection Management**
   - WebSocket connections rely on API Gateway state
   - **Improvement**: Add Redis for connection state caching

5. **No retry logic for lost connections**
- If connection is lost during chat, retry is not implemented, but they are notified. The users have to start a new chat
   - **Improvement**: Implement retry logic for lost connections

## Technical Implementation Details

### WebSocket Message Types
```typescript
// Client -> Server actions
START_SEARCH | STOP_SEARCH | SEND_MESSAGE | END_CHAT

// Server -> Client responses
CONNECTED | SEARCHING | MATCHED | MESSAGE | 
CHAT_ENDED | PARTNER_DISCONNECTED | ERROR
```

### Rate Limiting
- **Client-side**: 1-second cooldown between messages
- **Server-side**: 10 messages per minute per user
- **Message validation**: 500 character limit

## UI Features

![Chat Interface - Home](assets/ui-001.png)
![Chat Interface - Searching](assets/ui-002.png)
![Chat Interface - Connected](assets/ui-003.png)
![Chat Interface - Chatting](assets/ui-004.png)

### Core Functionality
- Anonymous user connection (no login required)
- Temporary session/user ID generation
- Fair FIFO-based matchmaking with emergent randomness (one active chat per user)
- Real-time text messaging
- Skip/end chat and re-match functionality
- Proper disconnect handling with partner notification
- Basic message limits (rate & length)