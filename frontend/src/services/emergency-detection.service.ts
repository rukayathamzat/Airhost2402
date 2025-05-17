import { supabase } from '../lib/supabase';
import { EmergencyNotificationService } from './emergency-notification.service';

export interface EmergencyCase {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  severity: 'immediate' | 'urgent' | 'standard';
  response_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyDetectionResult {
  detected: boolean;
  severity: 'immediate' | 'urgent' | 'standard' | null;
  matchedCase: Pick<EmergencyCase, 'id' | 'name' | 'description' | 'response_template' | 'severity'> | null;
  matchedKeywords: string[];
}

export class EmergencyDetectionService {
  private static instance: EmergencyDetectionService;
  private propertyId: string | null = null;

  private constructor() {}

  static getInstance(): EmergencyDetectionService {
    if (!EmergencyDetectionService.instance) {
      EmergencyDetectionService.instance = new EmergencyDetectionService();
    }
    return EmergencyDetectionService.instance;
  }

  setPropertyId(propertyId: string) {
    this.propertyId = propertyId;
  }

  async detectEmergency(message: string): Promise<EmergencyDetectionResult> {
    if (!this.propertyId) {
      throw new Error('Property ID not set');
    }

    try {
      // Get all active emergency cases for the property
      const { data: cases, error } = await supabase
        .from('emergency_cases')
        .select('*')
        .eq('property_id', this.propertyId)
        .eq('is_active', true);

      if (error) throw error;

      const lowerMessage = message.toLowerCase();
      let matchedCase: Pick<EmergencyCase, 'id' | 'name' | 'description' | 'response_template' | 'severity'> | null = null;
      let matchedKeywords: string[] = [];

      // Check each case's keywords against the message
      for (const case_ of (cases as EmergencyCase[]) || []) {
        const foundKeywords = case_.keywords.filter((keyword: string) => 
          lowerMessage.includes(keyword.toLowerCase())
        );

        if (foundKeywords.length > 0) {
          matchedCase = {
            id: case_.id,
            name: case_.name,
            description: case_.description,
            response_template: case_.response_template,
            severity: case_.severity
          };
          matchedKeywords = foundKeywords;
          break;
        }
      }

      // Log the detection if an emergency was found
      if (matchedCase) {
        await this.logEmergencyDetection(message, matchedCase, matchedKeywords);
      }

      return {
        detected: !!matchedCase,
        severity: matchedCase?.severity || null,
        matchedCase,
        matchedKeywords
      };
    } catch (error) {
      console.error('Error detecting emergency:', error);
      throw error;
    }
  }

  private async logEmergencyDetection(
    message: string,
    matchedCase: Pick<EmergencyCase, 'id' | 'name'>,
    matchedKeywords: string[]
  ) {
    try {
      const { error } = await supabase
        .from('emergency_detection_logs')
        .insert({
          property_id: this.propertyId,
          emergency_case_id: matchedCase.id,
          message,
          matched_keywords: matchedKeywords,
          detected_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging emergency detection:', error);
      // Don't throw the error as this is a non-critical operation
    }
  }

  async getEmergencyCases(): Promise<EmergencyCase[]> {
    if (!this.propertyId) {
      throw new Error('Property ID not set');
    }

    try {
      const { data, error } = await supabase
        .from('emergency_cases')
        .select('*')
        .eq('property_id', this.propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmergencyCase[];
    } catch (error) {
      console.error('Error fetching emergency cases:', error);
      throw error;
    }
  }

  async createEmergencyCase(caseData: Omit<EmergencyCase, 'id' | 'property_id' | 'created_at' | 'updated_at'>) {
    if (!this.propertyId) {
      throw new Error('Property ID not set');
    }

    try {
      const { data, error } = await supabase
        .from('emergency_cases')
        .insert({
          ...caseData,
          property_id: this.propertyId,
          is_active: caseData.is_active ?? true
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmergencyCase;
    } catch (error) {
      console.error('Error creating emergency case:', error);
      throw error;
    }
  }

  async updateEmergencyCase(
    id: string,
    caseData: Partial<Omit<EmergencyCase, 'id' | 'property_id' | 'created_at' | 'updated_at'>>
  ) {
    if (!this.propertyId) {
      throw new Error('Property ID not set');
    }

    try {
      const { data, error } = await supabase
        .from('emergency_cases')
        .update(caseData)
        .eq('id', id)
        .eq('property_id', this.propertyId)
        .select()
        .single();

      if (error) throw error;
      return data as EmergencyCase;
    } catch (error) {
      console.error('Error updating emergency case:', error);
      throw error;
    }
  }

  async deleteEmergencyCase(id: string) {
    if (!this.propertyId) {
      throw new Error('Property ID not set');
    }

    try {
      const { error } = await supabase
        .from('emergency_cases')
        .delete()
        .eq('id', id)
        .eq('property_id', this.propertyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting emergency case:', error);
      throw error;
    }
  }

  static async notifyPropertyManager(propertyId: string, data: {
    message: string;
    severity: 'immediate' | 'urgent' | 'standard';
    detectedKeywords: string[];
    emergencyCaseId?: string;
    emergencyCaseName?: string;
  }) {
    try {
      await EmergencyNotificationService.getInstance().sendEmergencyNotification({
        propertyId,
        message: data.message,
        severity: data.severity,
        detectedKeywords: data.detectedKeywords,
        emergencyCaseId: data.emergencyCaseId,
        emergencyCaseName: data.emergencyCaseName
      });
    } catch (error) {
      console.error('Error notifying property manager:', error);
      throw error;
    }
  }
} 