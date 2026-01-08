import { repository } from '../repositories/database.repository.js';
import { websocket } from '../utils/websocket.util.js';
import { MessageType } from '../types/websocket.types.js';
import { logger } from '../utils/logger.util.js';

export class MatchmakingService {
  async stopSearch(connectionId: string): Promise<void> {
    const user = await repository.getUserByConnectionId(connectionId);
    if (!user) return;
    await repository.removeUserFromQueue(user.user_id);
    await repository.setUserState(user.user_id, 'IDLE');
    await websocket.send(connectionId, { type: MessageType.SEARCH_ENDED });
  }

  async startSearch(connectionId: string): Promise<void> {
    const user = await repository.getUserByConnectionId(connectionId);
    
    if (!user) {
      logger.error('User not found during search', { connectionId });
      await websocket.send(connectionId, { 
        type: MessageType.ERROR, 
        payload: { message: 'Session expired, please reconnect' } 
      });
      return;
    }

    const match = await repository.attemptMatch(user.user_id, connectionId);

    if (match.matched && match.partnerConnectionId && match.chatId) {
      await Promise.all([
        websocket.send(connectionId, { type: MessageType.MATCHED, payload: { chatId: match.chatId } }),
        websocket.send(match.partnerConnectionId, { type: MessageType.MATCHED, payload: { chatId: match.chatId } })
      ]);
    } else {
      await websocket.send(connectionId, { type: MessageType.SEARCHING });
    }
  }

  async endChat(connectionId: string): Promise<void> {
    const user = await repository.getUserByConnectionId(connectionId);
    if (!user) return;

    const result = await repository.endChat(user.user_id);
    if (result) {
      await Promise.all([
        websocket.send(connectionId, { type: MessageType.CHAT_ENDED }),
        websocket.send(result.partnerConnectionId, { type: MessageType.CHAT_ENDED })
      ]);
    }
  }
}

export const matchmakingService = new MatchmakingService();