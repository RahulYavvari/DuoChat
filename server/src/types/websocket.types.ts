export enum MessageType {
  CONNECTED = 'CONNECTED',
  SEARCHING = 'SEARCHING',
  MATCHED = 'MATCHED',
  MESSAGE = 'MESSAGE',
  CHAT_ENDED = 'CHAT_ENDED',
  PARTNER_DISCONNECTED = 'PARTNER_DISCONNECTED',
  ERROR = 'ERROR',
  SEARCH_ENDED = 'SEARCH_ENDED'
}

export enum ClientAction {
  START_SEARCH = 'START_SEARCH',
  STOP_SEARCH = 'STOP_SEARCH',
  SEND_MESSAGE = 'SEND_MESSAGE',
  END_CHAT = 'END_CHAT'
}

export interface IncomingMessage {
  action: ClientAction;
  payload?: any;
}

export interface OutgoingMessage {
  type: MessageType;
  payload?: any;
  timestamp?: number;
}