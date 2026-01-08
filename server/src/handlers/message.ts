import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { matchmakingService } from '../services/matchmaking.service.js';
import { messagingService } from '../services/messaging.service.js';
import { websocket } from '../utils/websocket.util.js';
import { logger } from '../utils/logger.util.js';
import { ClientAction } from '../types/websocket.types.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId!;
  websocket.initialize(process.env.WEBSOCKET_ENDPOINT!);

  try {
    const { action, payload } = JSON.parse(event.body || '{}');

    switch (action) {
      case ClientAction.START_SEARCH:
        await matchmakingService.startSearch(connectionId);
        break;
      case ClientAction.STOP_SEARCH:
        await matchmakingService.stopSearch(connectionId);
        break;
      case ClientAction.SEND_MESSAGE:
        await messagingService.sendMessage(connectionId, payload);
        break;
      case ClientAction.END_CHAT:
        await matchmakingService.endChat(connectionId);
        break;
      default:
        return { statusCode: 400, body: 'Unknown action' };
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error: any) {
    logger.error('Message handler error', { connectionId, error: error.message });
    return { statusCode: 500, body: 'Error' };
  }
};