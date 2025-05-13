import OpenAI from 'openai';
import { supabase } from '../lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIService {
  static async generateResponse(
    userId: string,
    propertyId: string,
    conversationContext: string[]
  ) {
    try {
      // Récupérer les informations de la propriété et la FAQ
      const { data: property } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      const { data: faqs } = await supabase
        .from('faqs')
        .select('question, answer')
        .eq('property_id', propertyId);

      // Construire le contexte
      const context = `
Informations sur la propriété :
${JSON.stringify(property, null, 2)}

FAQ de la propriété :
${faqs?.map(faq => `Q: ${faq.question}\nR: ${faq.answer}`).join('\n\n')}

Conversation récente :
${conversationContext.join('\n')}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Vous êtes un assistant pour un hôte Airbnb. Répondez de manière professionnelle et amicale. Utilisez les informations fournies sur la propriété et la FAQ pour donner des réponses précises."
          },
          {
            role: "user",
            content: context
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI generation error:', error);
      throw error;
    }
  }
}
