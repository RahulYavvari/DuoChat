# DuoChat - Anonymous Real-time Chat Platform

A modern, scalable anonymous chat application that connects strangers for real-time conversations. Built with React.js frontend and serverless AWS backend architecture.

## Live Deployment

- **Frontend**: [https://duochat-app.vercel.app](https://duochat-app.vercel.app)
- **Backend**: AWS API Gateway WebSocket (ap-south-2 region)

## Architecture Overview

![Architecture Diagram](assets/architecture-diagram.png)

### Frontend Architecture
- **React.js** with modern hooks-based architecture
- **Vite** for fast development and optimized builds
- **WebSocket Service** for real-time communication
- **Local Storage** for persistent user sessions
- **Component-based UI** with minimal, functional design

### Backend Architecture
- **AWS API Gateway** with WebSocket support for real-time communication
- **AWS Lambda** functions for serverless, scalable business logic
- **Neon PostgreSQL** with connection pooling for data persistence
- **Serverless Framework** for infrastructure as code deployment

### Database Design
The PostgreSQL schema is optimized for concurrent matchmaking and real-time operations:

```sql
-- Core tables for user management and chat state
connections (user_id, connection_id, status, matched_with)
waiting_queue (user_id, connection_id, joined_at)
active_chats (chat_id, user1_id, user2_id, connection_ids)
message_log (user_id, sent_at, message_length) -- For rate limiting
```

**Key Design Decisions:**
- **UUID-based user identification** for complete anonymity
- **Connection pooling** in Neon to reduce latency and improve performance
- **Database-level matchmaking function** with `FOR UPDATE SKIP LOCKED` for concurrent safety
- **Separate waiting queue** for efficient FIFO matchmaking
- **Message logging table** for rate limiting and analytics

## Matchmaking & Chat Flow

### 1. User Connection
```
Client → WebSocket Connect → Lambda Connect Handler
→ Generate UUID → Store in DB → Return User ID
```

### 2. Matchmaking Process
```
Start Search → Add to Waiting Queue → Database Match Function
→ Find Partner → Create Chat Room → Notify Both Users
```

### 3. Real-time Messaging
```
Send Message → Rate Limit Check → Forward to Partner
→ Log Message → Update Activity Timestamp
```

### 4. Chat Termination
```
End Chat/Skip → Clean Up Chat Room → Reset User States
→ Notify Partner → Return to Idle State
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
```

### Backend Deployment (Serverless Framework)
```bash
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
RATE_LIMIT_MESSAGES=10
RATE_LIMIT_WINDOW_MINUTES=1
```

## Known Limitations & Production Improvements

### Current Functional Limitations

1. **Single Database Instance**
   - All operations hit one PostgreSQL database
   - **Improvement**: Implement read replicas for message history queries

2. **Individual Message Logging**
   - Each message creates a separate DB write for rate limiting
   - **Improvement**: Implement bulk writes or Redis-based rate limiting

3. **No Message Persistence**
   - Messages are not stored after delivery
   - **Improvement**: Add message history table for chat persistence

4. **Memory-based Connection Management**
   - WebSocket connections rely on API Gateway state
   - **Improvement**: Add Redis for connection state caching

5. **Basic Rate Limiting**
   - Simple message count per time window
   - **Improvement**: Implement token bucket algorithm with Redis

### Scalability Improvements for High Traffic

1. **In-Memory State Management**
   ```typescript
   // Current: Database-heavy operations
   // Proposed: Redis for active connections and queue
   const redis = new Redis(process.env.REDIS_URL);
   await redis.sadd('waiting_queue', userId);
   ```

2. **Bulk Database Operations**
   ```sql
   -- Current: Individual message inserts
   INSERT INTO message_log (user_id, message_length) VALUES ($1, $2);
   
   -- Proposed: Bulk inserts every 5 seconds
   INSERT INTO message_log (user_id, message_length, sent_at) VALUES 
   (user1, len1, now()), (user2, len2, now()), ...;
   ```

3. **Geographic Distribution**
   - Deploy to multiple AWS regions
   - Route users to nearest endpoint via CloudFront

4. **Connection Pooling Optimization**
   - Implement connection pooling at application level
   - Use PgBouncer for better connection management

### Monitoring & Analytics
- Add CloudWatch metrics for connection counts
- Implement structured logging with correlation IDs
- Add performance monitoring for Lambda functions

## Technical Implementation Details

### WebSocket Message Types
```typescript
// Client → Server actions
START_SEARCH | STOP_SEARCH | SEND_MESSAGE | END_CHAT

// Server → Client responses
CONNECTED | SEARCHING | MATCHED | MESSAGE | 
CHAT_ENDED | PARTNER_DISCONNECTED | ERROR
```

### Rate Limiting
- **Client-side**: 1-second cooldown between messages
- **Server-side**: 10 messages per minute per user
- **Message validation**: 500 character limit

### Security Considerations
- Input sanitization for all messages
- SQL injection prevention with parameterized queries
- WebSocket connection validation
- CORS configuration for production

## UI Features

![Chat Interface](assets/chat-interface.png)

### Core Functionality
- Anonymous user connection (no login required)
- Temporary session/user ID generation
- Random matchmaking (one active chat per user)
- Real-time text messaging
- Skip/end chat and re-match functionality
- Proper disconnect handling with partner notification
- Basic message limits (rate & length)

### User Interface
- **Start Screen**: Simple landing with chat initiation
- **Chat Screen**: Real-time messaging interface
- **Status Indicators**: Searching, Connected, Partner disconnected
- **Minimal Styling**: Functional design focused on usability

## Key Points

### Correctness of Matchmaking & Chat Flow
- FIFO queue implementation ensures fair matching
- Atomic database transactions prevent race conditions
- Proper state transitions between IDLE → SEARCHING → CHATTING

### Real-time Communication Handling
- WebSocket connections with automatic reconnection
- Message delivery confirmation and error handling
- Partner disconnection detection and notification

### Deployment Quality and Documentation
- Infrastructure as code with Serverless Framework
- Environment-specific configurations
- Comprehensive documentation and setup instructions