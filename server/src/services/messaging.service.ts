import { repository } from '../repositories/database.repository.js';
import { websocket } from '../utils/websocket.util.js';
import { Validator } from '../utils/validator.util.js';
import { MessageType } from '../types/websocket.types.js';
import { logger } from '../utils/logger.util.js';

export class MessagingService {
  async sendMessage(connectionId: string, payload: { message: string; messageId?: number }): Promise<void> {
    const validation = Validator.isValidMessage(payload.message);
    if (!validation.valid) {
      await websocket.send(connectionId, { type: MessageType.ERROR, payload: { message: validation.error, messageId: payload.messageId } });
      return;
    }

    const user = await repository.getUserByConnectionId(connectionId);

    if (!user) throw new Error('User not found');
    logger.info('User found', { userId: user.user_id });
    const allowed = await repository.checkRateLimit(user.user_id);
    if (!allowed) {
      await websocket.send(connectionId, { type: MessageType.ERROR, payload: { message: 'Rate limit exceeded', messageId: payload.messageId } });
      return;
    }
    const chat = await repository.getChatByUserId(user.user_id);
    logger.info('Chat found before', { chat });
    if (!chat) {
      await websocket.send(connectionId, { type: MessageType.ERROR, payload: { message: 'Not in chat', messageId: payload.messageId } });
      return;
    }
    await repository.logMessage(user.user_id, payload.message.length);

    const sent = await websocket.send(chat.partner_connection_id, {
      type: MessageType.MESSAGE,
      payload: { message: Validator.sanitizeMessage(payload.message) },
      timestamp: Date.now()
    });

    if (!sent) {
      await repository.endChat(user.user_id);
      await websocket.send(connectionId, { type: MessageType.PARTNER_DISCONNECTED });
    }
  }
}

export const messagingService = new MessagingService();