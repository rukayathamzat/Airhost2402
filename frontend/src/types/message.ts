// Types pour le système de messagerie
export interface Message {
  id: string;
  content: string;
  conversation_id: string;
  created_at: string;
  direction: 'inbound' | 'outbound';
  read?: boolean;
  sender_id?: string;
  error?: boolean;
  error_message?: string;
  media_url?: string;
  media_type?: string;
}

export interface Conversation {
  id: string;
  guest_name: string;
  guest_phone: string;
  property_id: string;
  status?: string;
  check_in_date?: string;
  check_out_date?: string;
  created_at?: string;
  last_message_at?: string;
}
