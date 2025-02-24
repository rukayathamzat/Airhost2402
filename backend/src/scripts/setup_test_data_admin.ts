import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNzk5MzI3OCwiZXhwIjoyMDIzNTY5Mjc4fQ.ywBfNvNqRYxQB4UKzYDVphzMO_gSf0HHpxXwBOZDHJE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestData() {
  try {
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('host_id', '7d3ca44d-f2d2-4109-8885-8ef004ee63ff')
      .single();

    if (!property) {
      throw new Error('Propriété non trouvée');
    }

    // Conversation 1 (récente)
    const { data: conv1 } = await supabase
      .from('conversations')
      .insert({
        host_id: '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
        guest_number: '33612345678',
        property_id: property.id,
        last_message: 'Bonjour, je suis intéressé par votre appartement',
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        unread_count: 1
      })
      .select()
      .single();

    if (!conv1) {
      throw new Error('Erreur lors de la création de la conversation 1');
    }

    // Message pour conversation 1
    await supabase
      .from('messages')
      .insert({
        conversation_id: conv1.id,
        content: 'Bonjour, je suis intéressé par votre appartement',
        direction: 'inbound',
        status: 'delivered'
      });

    // Conversation 2 (ancienne)
    const { data: conv2 } = await supabase
      .from('conversations')
      .insert({
        host_id: '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
        guest_number: '33698765432',
        property_id: property.id,
        last_message: 'Merci pour votre réponse',
        last_message_at: new Date(Date.now() - 172800000).toISOString(),
        unread_count: 0
      })
      .select()
      .single();

    if (!conv2) {
      throw new Error('Erreur lors de la création de la conversation 2');
    }

    // Messages pour conversation 2
    await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conv2.id,
          content: 'Bonjour, est-ce que l\'appartement est disponible pour juillet ?',
          direction: 'inbound',
          status: 'delivered'
        },
        {
          conversation_id: conv2.id,
          content: 'Oui, l\'appartement est disponible en juillet. Quelles sont vos dates exactes ?',
          direction: 'outbound',
          status: 'delivered'
        },
        {
          conversation_id: conv2.id,
          content: 'Merci pour votre réponse',
          direction: 'inbound',
          status: 'delivered'
        }
      ]);

    console.log('Données de test créées avec succès !');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

setupTestData();
