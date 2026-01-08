import { repository } from '../repositories/database.repository.js';
import { websocket } from '../utils/websocket.util.js';
import { MessageType } from '../types/websocket.types.js';

export class ConnectionService {
  async handleConnect(connectionId: string): Promise<string> {
    const userId = await repository.createConnection(connectionId);
    await websocket.send(connectionId, { type: MessageType.CONNECTED, payload: { userId } });
    return userId;
  }

  async handleDisconnect(connectionId: string): Promise<void> {
    const result = await repository.handleDisconnect(connectionId);
    if (result?.partnerConnectionId) {
      await websocket.send(result.partnerConnectionId, { type: MessageType.PARTNER_DISCONNECTED });
    }
  }
}

export const connectionService = new ConnectionService();