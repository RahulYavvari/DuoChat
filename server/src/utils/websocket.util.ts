import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { logger } from './logger.util.js';
import { OutgoingMessage } from '../types/websocket.types.js';

class WebSocketUtil {
  private client: ApiGatewayManagementApiClient | null = null;

  initialize(endpoint: string) {
    this.client = new ApiGatewayManagementApiClient({
      endpoint: endpoint.replace('wss://', 'https://'),
    });
  }

  async send(connectionId: string, message: OutgoingMessage): Promise<boolean> {
    if (!this.client) {
      throw new Error('WebSocket not initialized');
    }

    try {
      const command = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(message)),
      });

      await this.client.send(command);
      logger.debug('Message sent', { connectionId, type: message.type });
      return true;
    } catch (error: any) {
      if (error.statusCode === 410 || error.name === 'GoneException') {
        logger.warn('Stale connection', { connectionId });
        return false;
      }
      logger.error('Failed to send message', { connectionId, error: error.message });
      throw error;
    }
  }

  async sendToMultiple(
    connectionIds: string[],
    message: OutgoingMessage
  ): Promise<void> {
    await Promise.all(
      connectionIds.map(id => this.send(id, message).catch(err => 
        logger.error('Failed to send to connection', { connectionId: id, error: err })
      ))
    );
  }
}

export const websocket = new WebSocketUtil();