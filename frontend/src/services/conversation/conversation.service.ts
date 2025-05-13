import { supabase } from '../../lib/supabase';

export class ConversationService {
  private static instance: ConversationService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService();
    }
    return ConversationService.instance;
  }

  public static async init(): Promise<void> {
    const instance = ConversationService.getInstance();
    if (!instance.initialized) {
      // Initialize conversation service
      instance.initialized = true;
    }
  }

  public async createConversation(userId: string, title: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([
          {
            user_id: userId,
            title,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  public async getConversations(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }
} 