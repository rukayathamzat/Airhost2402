import { supabase } from '../lib/supabase';

// Emergency keywords in multiple languages
const EMERGENCY_KEYWORDS = {
  en: [
    'emergency', 'urgent', 'help', 'danger', 'fire', 'flood', 'break-in',
    'accident', 'injury', 'medical', 'police', 'ambulance', '911'
  ],
  fr: [
    'urgence', 'urgent', 'aide', 'danger', 'feu', 'inondation', 'cambriolage',
    'accident', 'blessure', 'médical', 'police', 'ambulance', 'pompier'
  ]
};

// Emergency response templates
const EMERGENCY_RESPONSES = {
  en: {
    immediate: "EMERGENCY DETECTED: Please call emergency services immediately at 911. I'll notify the property manager right away.",
    urgent: "URGENT: I've notified the property manager. Please provide more details about the situation.",
    standard: "I've detected an emergency situation. Please confirm if you need immediate assistance."
  },
  fr: {
    immediate: "URGENCE DÉTECTÉE : Veuillez appeler les services d'urgence au 112. Je vais prévenir le gestionnaire immédiatement.",
    urgent: "URGENT : J'ai prévenu le gestionnaire. Veuillez fournir plus de détails sur la situation.",
    standard: "J'ai détecté une situation d'urgence. Veuillez confirmer si vous avez besoin d'une assistance immédiate."
  }
};

export class EmergencyDetectionService {
  static async detectEmergency(message: string, language: string = 'en'): Promise<{
    isEmergency: boolean;
    severity: 'immediate' | 'urgent' | 'standard' | null;
    response: string | null;
    detectedKeywords: string[];
  }> {
    try {
      // Convert message to lowercase for case-insensitive matching
      const lowerMessage = message.toLowerCase();
      
      // Get keywords for the specified language
      const keywords = EMERGENCY_KEYWORDS[language as keyof typeof EMERGENCY_KEYWORDS] || EMERGENCY_KEYWORDS.en;
      
      // Check for emergency keywords
      const foundKeywords = keywords.filter(keyword => lowerMessage.includes(keyword.toLowerCase()));
      
      if (foundKeywords.length === 0) {
        return { isEmergency: false, severity: null, response: null, detectedKeywords: [] };
      }

      // Determine severity based on keywords and context
      let severity: 'immediate' | 'urgent' | 'standard' = 'standard';
      
      // Immediate severity keywords
      const immediateKeywords = ['fire', 'flood', 'break-in', 'accident', 'injury', 'medical', 'police', 'ambulance', '911',
                               'feu', 'inondation', 'cambriolage', 'accident', 'blessure', 'médical', 'police', 'ambulance', 'pompier'];
      
      // Urgent severity keywords
      const urgentKeywords = ['emergency', 'urgent', 'help', 'danger', 'urgence', 'urgent', 'aide', 'danger'];
      
      if (foundKeywords.some(keyword => immediateKeywords.includes(keyword))) {
        severity = 'immediate';
      } else if (foundKeywords.some(keyword => urgentKeywords.includes(keyword))) {
        severity = 'urgent';
      }

      // Get appropriate response template
      const responses = EMERGENCY_RESPONSES[language as keyof typeof EMERGENCY_RESPONSES] || EMERGENCY_RESPONSES.en;
      const response = responses[severity];

      // Log the emergency detection
      await this.logEmergencyDetection(message, severity, foundKeywords);

      return {
        isEmergency: true,
        severity,
        response,
        detectedKeywords: foundKeywords
      };
    } catch (error) {
      console.error('Error in emergency detection:', error);
      // In case of error, assume it's an emergency to be safe
      return {
        isEmergency: true,
        severity: 'standard',
        response: EMERGENCY_RESPONSES.en.standard,
        detectedKeywords: []
      };
    }
  }

  private static async logEmergencyDetection(
    message: string,
    severity: 'immediate' | 'urgent' | 'standard',
    detectedKeywords: string[]
  ): Promise<void> {
    try {
      await supabase
        .from('emergency_logs')
        .insert({
          message,
          severity,
          detected_keywords: detectedKeywords,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging emergency detection:', error);
    }
  }

  static async notifyPropertyManager(
    propertyId: string,
    emergencyDetails: {
      message: string;
      severity: 'immediate' | 'urgent' | 'standard';
      detectedKeywords: string[];
    }
  ): Promise<void> {
    try {
      // Get property manager contact information
      const { data: property } = await supabase
        .from('properties')
        .select('manager_email, manager_phone')
        .eq('id', propertyId)
        .single();

      if (!property) {
        throw new Error('Property not found');
      }

      // Create notification record
      await supabase
        .from('emergency_notifications')
        .insert({
          property_id: propertyId,
          manager_email: property.manager_email,
          manager_phone: property.manager_phone,
          emergency_details: emergencyDetails,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      // TODO: Implement actual notification sending (email, SMS, etc.)
      console.log('Emergency notification created for property manager:', {
        propertyId,
        emergencyDetails
      });
    } catch (error) {
      console.error('Error notifying property manager:', error);
      throw error;
    }
  }
} 