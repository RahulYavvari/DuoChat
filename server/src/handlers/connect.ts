import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { connectionService } from '../services/connection.service.js';
import { websocket } from '../utils/websocket.util.js';
import { logger } from '../utils/logger.util.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId!;
  websocket.initialize(process.env.WEBSOCKET_ENDPOINT!);

  try {
    const userId = await connectionService.handleConnect(connectionId);
    logger.info('User connected', { connectionId, userId });
    return { statusCode: 200, body: 'Connected' };
  } catch (error: any) {
    logger.error('Connect error', { connectionId, error: error.message });
    return { statusCode: 500, body: 'Failed to connect' };
  }
};