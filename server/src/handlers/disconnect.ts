import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { connectionService } from '../services/connection.service.js';
import { websocket } from '../utils/websocket.util.js';
import { logger } from '../utils/logger.util.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId!;
  websocket.initialize(process.env.WEBSOCKET_ENDPOINT!);

  try {
    await connectionService.handleDisconnect(connectionId);
    logger.info('User disconnected', { connectionId });
    return { statusCode: 200, body: 'Disconnected' };
  } catch (error: any) {
    logger.error('Disconnect error', { connectionId, error: error.message });
    return { statusCode: 500, body: 'Failed' };
  }
};