import { OpenAI } from 'openai';
import { supabase } from '../lib/supabase';

export class AIResponseService {
  private static openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY
  });

  static async generateResponse(apartmentId: string, conversationId: string) {
    // Récupération des données en parallèle
    const [apartmentData, messagesData] = await Promise.all([
      supabase.from('apartments')
        .select('ai_config')
        .eq('id', apartmentId)
        .single(),
      supabase.from('messages')
        .select('content, created_at, sender')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10)
    ]);

    if (apartmentData.error) throw new Error('Erreur de configuration : ' + apartmentData.error.message);
    if (messagesData.error) throw new Error('Erreur messages : ' + messagesData.error.message);

    if (!apartmentData.data?.ai_config || !messagesData.data) {
      throw new Error('Données manquantes pour générer une réponse');
    }

    const prompt = this.buildPrompt(apartmentData.data.ai_config, messagesData.data);
    const response = await this.getAIResponse(prompt);

    // Log de la réponse
    await supabase.from('ai_responses_log').insert({
      apartment_id: apartmentId,
      conversation_id: conversationId,
      generated_response: response,
      prompt_context: prompt
    });

    return response;
  }

  private static buildPrompt(aiConfig: any, messages: any[]) {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const conversationHistory = messages
      .map(m => `${m.sender}: ${m.content}`)
      .join('\n');

    return `
Tu es un assistant virtuel pour un hôte Airbnb. Réponds au dernier message du client.

[CONFIGURATION]
Règles de la maison:
${aiConfig.house_rules}

FAQ:
${aiConfig.faq.join('\n')}

Ton de réponse souhaité: ${aiConfig.response_tone}

[CONVERSATION RÉCENTE]
${conversationHistory}

[DERNIER MESSAGE]
${lastMessage}

[INSTRUCTIONS]
1. Réponds de manière concise (max 3 phrases)
2. Utilise le ton ${aiConfig.response_tone}
3. Intègre les règles et FAQ si pertinent
4. Sois précis et factuel
`;
  }

  private static async getAIResponse(prompt: string) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 150,
        presence_penalty: 0.5,
        frequency_penalty: 0.3
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Réponse vide de l\'API');
      return this.validateResponse(content);
    } catch (error) {
      console.error('Erreur OpenAI:', error);
      throw new Error('Erreur de génération AI');
    }
  }

  private static validateResponse(text: string): string {
    if (!text) throw new Error('Réponse vide');
    if (/(http|@|#)/i.test(text)) throw new Error('Réponse non sécurisée');
    
    return text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
