export interface DisconnectResult {
  userId: string;
  partnerConnectionId: string | null;
}

export interface EndChatResult {
  partner_id: string;
  partner_connection_id: string;
}