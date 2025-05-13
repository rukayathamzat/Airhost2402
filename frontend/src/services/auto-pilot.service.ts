import { supabase } from '../lib/supabase';
import { AIResponseService } from './ai-response.service';

interface PriorityRule {
  keywords: string[];
  responseDelay: number;
}

interface PriorityRules {
  high: PriorityRule;
  medium: PriorityRule;
  low: PriorityRule;
}

interface ScheduledResponse {
  id: string;
  time: string; // HH:mm format
  message: string;
  days: number[]; // 0-6 for Sunday-Saturday
  enabled: boolean;
}

interface AutoPilotConfig {
  isEnabled: boolean;
  responseDelay: number;
  maxDailyResponses: number;
  workingHours: {
    start: string;
    end: string;
  };
  excludedKeywords: string[];
  priorityRules: PriorityRules;
  scheduledResponses: ScheduledResponse[];
}

export class AutoPilotService {
  private static defaultConfig: AutoPilotConfig = {
    isEnabled: false,
    responseDelay: 5000,
    maxDailyResponses: 50,
    workingHours: {
      start: "08:00",
      end: "20:00"
    },
    excludedKeywords: ['emergency', 'urgent', 'help', 'danger'],
    priorityRules: {
      high: {
        keywords: ['urgent', 'important', 'asap'],
        responseDelay: 1000
      },
      medium: {
        keywords: ['question', 'help', 'info'],
        responseDelay: 5000
      },
      low: {
        keywords: ['general', 'thanks', 'ok'],
        responseDelay: 10000
      }
    },
    scheduledResponses: []
  };

  static async getConfig(propertyId: string): Promise<AutoPilotConfig> {
    try {
      const { data, error } = await supabase
        .from('auto_pilot_configs')
        .select('*')
        .eq('property_id', propertyId)
        .single();

      if (error) throw error;
      return data || this.defaultConfig;
    } catch (error) {
      console.error('Error fetching auto-pilot config:', error);
      return this.defaultConfig;
    }
  }

  static async updateConfig(propertyId: string, config: Partial<AutoPilotConfig>): Promise<void> {
    try {
      console.log('Updating auto-pilot config:', { propertyId, config });
      
      // First check if the table exists
      const { error: tableError } = await supabase
        .from('auto_pilot_configs')
        .select('id')
        .limit(1);

      if (tableError) {
        console.error('Table check error:', tableError);
        throw new Error(`Database table error: ${tableError.message}`);
      }

      const { error } = await supabase
        .from('auto_pilot_configs')
        .upsert({
          property_id: propertyId,
          ...config,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating auto-pilot config:', error);
      throw error;
    }
  }

  static async determinePriority(message: string, config: AutoPilotConfig): Promise<'high' | 'medium' | 'low'> {
    const lowerMessage = message.toLowerCase();
    
    for (const [priority, rule] of Object.entries(config.priorityRules)) {
      if (rule.keywords.some((keyword: string) => lowerMessage.includes(keyword.toLowerCase()))) {
        return priority as 'high' | 'medium' | 'low';
      }
    }
    
    return 'medium'; // default priority
  }

  static async shouldAutoRespond(
    propertyId: string,
    message: string,
    conversationId: string
  ): Promise<boolean> {
    try {
      const config = await this.getConfig(propertyId);
      if (!config.isEnabled) return false;

      // Check if within working hours
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
      if (currentTime < config.workingHours.start || currentTime > config.workingHours.end) {
        return false;
      }

      // Check for excluded keywords
      if (config.excludedKeywords.some(keyword => 
        message.toLowerCase().includes(keyword.toLowerCase())
      )) {
        return false;
      }

      // Check daily response limit for this conversation
      const today = now.toISOString().split('T')[0];
      const { count } = await supabase
        .from('auto_pilot_responses')
        .select('*', { count: 'exact' })
        .eq('property_id', propertyId)
        .eq('conversation_id', conversationId)
        .gte('created_at', today)
        .lt('created_at', new Date(now.getTime() + 86400000).toISOString());

      if (count && count >= config.maxDailyResponses) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking auto-respond conditions:', error);
      return false;
    }
  }

  static async generateAutoResponse(
    propertyId: string,
    message: string,
    conversationId: string
  ): Promise<string | null> {
    try {
      const config = await this.getConfig(propertyId);
      const startTime = Date.now();
      
      // Determine priority and get appropriate delay
      const priority = await this.determinePriority(message, config);
      const delay = config.priorityRules[priority].responseDelay;
      
      // Add delay before responding
      await new Promise(resolve => setTimeout(resolve, delay));

      // Generate AI response
      const response = await AIResponseService.generateResponse(propertyId, conversationId);
      
      // Log the auto-response
      await this.logAutoResponse(propertyId, conversationId, message, response);

      // Log analytics
      const responseTime = Date.now() - startTime;
      await this.logAnalytics(propertyId, conversationId, priority, responseTime);

      return typeof response === 'string' ? response : 
             Array.isArray(response) ? response[0] :
             response?.response || null;
    } catch (error) {
      console.error('Error generating auto-response:', error);
      return null;
    }
  }

  private static async logAutoResponse(
    propertyId: string,
    conversationId: string,
    originalMessage: string,
    response: any
  ): Promise<void> {
    try {
      await supabase
        .from('auto_pilot_responses')
        .insert({
          property_id: propertyId,
          conversation_id: conversationId,
          original_message: originalMessage,
          response: response,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging auto-response:', error);
    }
  }

  private static async logAnalytics(
    propertyId: string,
    conversationId: string,
    priorityLevel: string,
    responseTime: number
  ): Promise<void> {
    try {
      await supabase
        .from('auto_pilot_analytics')
        .insert({
          property_id: propertyId,
          conversation_id: conversationId,
          priority_level: priorityLevel,
          response_time: responseTime,
          success_rate: 1.0, // This could be calculated based on user feedback
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging analytics:', error);
    }
  }

  static async addScheduledResponse(
    propertyId: string,
    scheduledResponse: Omit<ScheduledResponse, 'id'>
  ): Promise<void> {
    try {
      const config = await this.getConfig(propertyId);
      const newResponse = {
        ...scheduledResponse,
        id: crypto.randomUUID()
      };
      
      await this.updateConfig(propertyId, {
        scheduledResponses: [...config.scheduledResponses, newResponse]
      });
    } catch (error) {
      console.error('Error adding scheduled response:', error);
      throw error;
    }
  }

  static async removeScheduledResponse(
    propertyId: string,
    responseId: string
  ): Promise<void> {
    try {
      const config = await this.getConfig(propertyId);
      await this.updateConfig(propertyId, {
        scheduledResponses: config.scheduledResponses.filter(r => r.id !== responseId)
      });
    } catch (error) {
      console.error('Error removing scheduled response:', error);
      throw error;
    }
  }
} 