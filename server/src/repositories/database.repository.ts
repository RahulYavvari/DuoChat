import { db } from '../config/database.config.js';
import { MatchResult, ChatPartner, EndChatResult } from '../types/chat.types.js';
import { ConnectionInfo } from '../types/user.types.js';
import { DisconnectResult } from '../types/repository.types.js';

export class DatabaseRepository {
  async createConnection(connectionId: string): Promise<string> {
    const result = await db.query(
      `INSERT INTO connections (connection_id, user_id, status)
       VALUES ($1, uuid_generate_v4(), 'IDLE')
       RETURNING user_id`,
      [connectionId]
    );
    return result.rows[0].user_id;
  }

  async setUserState(userId: string, state: string): Promise<void> {
    await db.query('UPDATE connections SET status = $1 WHERE user_id = $2', [state, userId]);
  }

  async attemptMatch(userId: string, connectionId: string): Promise<MatchResult> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const userCheck = await client.query(
        'SELECT user_id FROM connections WHERE connection_id = $1',
        [connectionId]
      );

      let actualUserId = userId;
      
      if (userCheck.rows.length === 0) {
        const createResult = await client.query(
          `INSERT INTO connections (connection_id, user_id, status)
           VALUES ($1, $2, 'IDLE')
           RETURNING user_id`,
          [connectionId, userId]
        );
        actualUserId = createResult.rows[0].user_id;
      } else {
        actualUserId = userCheck.rows[0].user_id;
      }

      const result = await client.query(
        'SELECT * FROM attempt_match($1, $2)',
        [actualUserId, connectionId]
      );

      await client.query('COMMIT');
      const row = result.rows[0];
      return {
        matched: row.matched,
        partnerUserId: row.partner_user_id,
        partnerConnectionId: row.partner_connection_id,
        chatId: row.chat_id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeUserFromQueue(userId: string): Promise<void> {
    const result = await db.query('SELECT * FROM waiting_queue WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) return;
    await db.query('DELETE FROM waiting_queue WHERE user_id = $1', [userId]);
  }

  async getUserByConnectionId(connectionId: string): Promise<ConnectionInfo | null> {
    const result = await db.query(
      'SELECT user_id, connection_id, status FROM connections WHERE connection_id = $1',
      [connectionId]
    );
    return result.rows[0] || null;
  }

  async getChatByUserId(userId: string): Promise<ChatPartner | null> {
    const result = await db.query(
      `SELECT 
        CASE WHEN user1_id = $1 THEN user2_id ELSE user1_id END as partner_id,
        CASE WHEN user1_id = $1 THEN user2_connection_id ELSE user1_connection_id END as partner_connection_id
       FROM active_chats 
       WHERE user1_id = $1 OR user2_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async checkRateLimit(userId: string): Promise<boolean> {
    const limit = parseInt(process.env.RATE_LIMIT_MESSAGES || '10');
    const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '1');

    const result = await db.query(
      `SELECT COUNT(*) as count FROM message_log 
       WHERE user_id = $1 AND sent_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
      [userId]
    );
    return parseInt(result.rows[0].count) < limit;
  }

  async logMessage(userId: string, messageLength: number): Promise<void> {
    await db.query(
      'INSERT INTO message_log (user_id, message_length) VALUES ($1, $2)',
      [userId, messageLength]
    );
  }

  async endChat(userId: string): Promise<EndChatResult | null> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const chatResult = await client.query(
        `SELECT user1_id, user2_id, user1_connection_id, user2_connection_id 
         FROM active_chats WHERE user1_id = $1 OR user2_id = $1`,
        [userId]
      );

      if (chatResult.rows.length === 0) {
        await client.query('COMMIT');
        return null;
      }

      const chat = chatResult.rows[0];
      const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
      const partnerConnectionId = chat.user1_id === userId ? chat.user2_connection_id : chat.user1_connection_id;

      await client.query('DELETE FROM active_chats WHERE user1_id = $1 OR user2_id = $1', [userId]);
      await client.query(`UPDATE connections SET status = 'IDLE', matched_with = NULL WHERE user_id = ANY($1)`, [[userId, partnerId]]);

      await client.query('COMMIT');
      return { partnerId, partnerConnectionId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async handleDisconnect(connectionId: string): Promise<DisconnectResult | null> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query('SELECT user_id, status FROM connections WHERE connection_id = $1', [connectionId]);
      if (userResult.rows.length === 0) {
        await client.query('COMMIT');
        return null;
      }

      const { user_id: userId, status } = userResult.rows[0];
      let partnerConnectionId = null;

      if (status === 'CHATTING') {
        const chat = await this.getChatByUserId(userId);
        if (chat) partnerConnectionId = chat.partner_connection_id;
        await this.endChat(userId);
      } else if (status === 'SEARCHING') {
        await client.query('DELETE FROM waiting_queue WHERE user_id = $1', [userId]);
      }

      await client.query('DELETE FROM connections WHERE connection_id = $1', [connectionId]);
      await client.query('COMMIT');

      return { userId, partnerConnectionId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const repository = new DatabaseRepository();