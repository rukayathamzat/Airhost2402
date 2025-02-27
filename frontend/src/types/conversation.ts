export interface Conversation {
  id: string;
  guest_name: string;
  guest_phone: string;
  property: Array<{
    name: string;
    host_id?: string;
  }>;
  check_in_date: string;
  check_out_date: string;
  status: string;
  last_message_at: string;
  created_at?: string;
  guest_number?: string;
  last_message?: string;
  unread_count?: number;
}

