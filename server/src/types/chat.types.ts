export interface Chat {
  chatId: string;
  user1Id: string;
  user2Id: string;
  user1ConnectionId: string;
  user2ConnectionId: string;
  startedAt: Date;
  messageCount: number;
}

export interface MatchResult {
  matched: boolean;
  partnerUserId: string | null;
  partnerConnectionId: string | null;
  chatId: string | null;
}

export interface ChatPartner {
  partner_id: string;
  partner_connection_id: string;
}

export interface EndChatResult {
  partnerId: string;
  partnerConnectionId: string;
}