export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      hosts: {
        Row: {
          id: string
          email: string
          phone_number_id: string | null
          whatsapp_access_token: string | null
          verify_token: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          phone_number_id?: string | null
          whatsapp_access_token?: string | null
          verify_token?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          phone_number_id?: string | null
          whatsapp_access_token?: string | null
          verify_token?: string | null
          created_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          host_id: string
          name: string
          address: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          host_id: string
          name: string
          address: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          host_id?: string
          name?: string
          address?: string
          description?: string | null
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          property_id: string
          guest_number: string
          unread_count: number
          last_message: string | null
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          guest_number: string
          unread_count?: number
          last_message?: string | null
          last_message_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          guest_number?: string
          unread_count?: number
          last_message?: string | null
          last_message_at?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          content: string
          type: 'text' | 'template'
          direction: 'inbound' | 'outbound'
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          content: string
          type: 'text' | 'template'
          direction: 'inbound' | 'outbound'
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          content?: string
          type?: 'text' | 'template'
          direction?: 'inbound' | 'outbound'
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          host_id: string
          name: string
          language: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          host_id: string
          name: string
          language: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          host_id?: string
          name?: string
          language?: string
          content?: string
          created_at?: string
        }
      }
    }
  }
}
