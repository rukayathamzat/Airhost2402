import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tornfqtvnzkgnwfudxdb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcm5mcXR2bnprZ253ZnVkeGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3ODM2NDUsImV4cCI6MjA1NTM1OTY0NX0.ZAXvm4bVRZFyg8WNxiam_vgQ2iItuN06UTL2AzKyPsE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  // 1. Créer les templates
  const { error: templateError } = await supabase
    .from('templates')
    .insert([
      {
        namespace: 'customer_support',
        name: 'welcome',
        language: 'fr',
        content: 'Bonjour ! Je suis {{1}}, votre hôte pour {{2}}. Comment puis-je vous aider ?'
      },
      {
        namespace: 'customer_support',
        name: 'booking_confirmed',
        language: 'fr',
        content: 'Votre réservation pour {{1}} est confirmée. Voici les détails : {{2}}'
      },
      {
        namespace: 'customer_support',
        name: 'conversation_expired',
        language: 'fr',
        content: 'La conversation a expiré. Pour continuer, veuillez envoyer un nouveau message.'
      }
    ]);

  if (templateError) {
    console.error('Erreur lors de la création des templates:', templateError);
    return;
  }

  // 2. Créer la première conversation
  const { data: conv1, error: conv1Error } = await supabase
    .from('conversations')
    .insert({
      host_id: '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
      guest_number: '33612345678',
      property_id: (await supabase
        .from('properties')
        .select('id')
        .eq('host_id', '7d3ca44d-f2d2-4109-8885-8ef004ee63ff')
        .single()
      ).data?.id,
      last_message: 'Bonjour, je suis intéressé par votre appartement',
      last_message_at: new Date(Date.now() - 3600000).toISOString(),
      unread_count: 1
    })
    .select()
    .single();

  if (conv1Error) {
    console.error('Erreur lors de la création de la conversation 1:', conv1Error);
    return;
  }

  // 3. Ajouter le message pour la première conversation
  const { error: msg1Error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conv1.id,
      content: 'Bonjour, je suis intéressé par votre appartement',
      direction: 'inbound',
      status: 'delivered'
    });

  if (msg1Error) {
    console.error('Erreur lors de la création du message 1:', msg1Error);
    return;
  }

  // 4. Créer la deuxième conversation
  const { data: conv2, error: conv2Error } = await supabase
    .from('conversations')
    .insert({
      host_id: '7d3ca44d-f2d2-4109-8885-8ef004ee63ff',
      guest_number: '33698765432',
      property_id: (await supabase
        .from('properties')
        .select('id')
        .eq('host_id', '7d3ca44d-f2d2-4109-8885-8ef004ee63ff')
        .single()
      ).data?.id,
      last_message: 'Merci pour votre réponse',
      last_message_at: new Date(Date.now() - 172800000).toISOString(), // -2 jours
      unread_count: 0
    })
    .select()
    .single();

  if (conv2Error) {
    console.error('Erreur lors de la création de la conversation 2:', conv2Error);
    return;
  }

  // 5. Ajouter les messages pour la deuxième conversation
  const { error: msg2Error } = await supabase
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

  if (msg2Error) {
    console.error('Erreur lors de la création des messages 2:', msg2Error);
    return;
  }

  console.log('Données de test créées avec succès !');
}

createTestData();
