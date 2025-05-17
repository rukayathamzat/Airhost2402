import { supabase } from '../lib/supabase';
import OpenAI from 'openai';

export interface UnknownQueryResult {
  isUnknown: boolean;
  confidence: number;
  reason: string;
  suggestedResponse?: string;
}

export class UnknownQueryService {
  private static instance: UnknownQueryService;
  private openai: OpenAI;
  private propertyId: string | null = null;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }

  static getInstance(): UnknownQueryService {
    if (!UnknownQueryService.instance) {
      UnknownQueryService.instance = new UnknownQueryService();
    }
    return UnknownQueryService.instance;
  }

  setPropertyId(propertyId: string) {
    this.propertyId = propertyId;
  }

  async detectUnknownQuery(message: string): Promise<UnknownQueryResult> {
    if (!this.propertyId) {
      throw new Error('Property ID not set');
    }

    try {
      // Get property context from database
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('name, description, amenities, house_rules')
        .eq('id', this.propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Prepare context for OpenAI
      const context = `
        Property: ${propertyData.name}
        Description: ${propertyData.description}
        Amenities: ${propertyData.amenities?.join(', ')}
        House Rules: ${propertyData.house_rules?.join(', ')}
      `;

      // Call OpenAI to analyze the message
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant analyzing guest messages for a property management system. 
            Your task is to determine if a message contains a query that cannot be confidently answered 
            based on the property information provided. Consider:
            1. If the query is about something not covered in the property information
            2. If the query requires clarification or additional context
            3. If the query is ambiguous or unclear
            4. If the query is about a topic outside the scope of property management
            
            Property Context:
            ${context}
            
            Respond with a JSON object containing:
            {
              "isUnknown": boolean,
              "confidence": number (0-1),
              "reason": string,
              "suggestedResponse": string (optional)
            }`
          },
          {
            role: "user",
            content: message
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}') as UnknownQueryResult;

      // Log the detection
      await this.logUnknownQueryDetection(message, result);

      return result;
    } catch (error) {
      console.error('Error detecting unknown query:', error);
      throw error;
    }
  }

  private async logUnknownQueryDetection(message: string, result: UnknownQueryResult) {
    if (!this.propertyId) return;

    try {
      await supabase
        .from('unknown_query_logs')
        .insert({
          property_id: this.propertyId,
          message,
          is_unknown: result.isUnknown,
          confidence: result.confidence,
          reason: result.reason,
          suggested_response: result.suggestedResponse,
          detected_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging unknown query detection:', error);
    }
  }
} 