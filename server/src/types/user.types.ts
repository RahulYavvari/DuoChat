export enum UserStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  CHATTING = 'CHATTING'
}

export interface User {
  userId: string;
  connectionId: string;
  status: UserStatus;
  matchedWith: string | null;
  connectedAt: Date;
  lastActivity: Date;
}

export interface ConnectionInfo {
  connection_id: string;
  user_id: string;
  status: UserStatus;
}