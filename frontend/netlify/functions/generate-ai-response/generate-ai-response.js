require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');

// Debug logging with more details
console.log('Current working directory:', process.cwd());
console.log('Environment variables:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set'
});

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables:', {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseKey ? 'Set' : 'Not set'
  });
  throw new Error('Missing Supabase credentials. Please check your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  throw new Error('Missing OpenAI API key. Please check your environment variables.');
}

const configuration = new Configuration({
  apiKey: openaiApiKey,
});
const openai = new OpenAIApi(configuration);

exports.handler = async (event, context) => {
  // Debug logging
  console.log('Function called with event:', {
    httpMethod: event.httpMethod,
    path: event.path,
    body: event.body
  });

  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      throw new Error('Only POST requests are allowed');
    }

    console.log('Received request body:', event.body);
    const { apartmentId, conversationId } = JSON.parse(event.body);

    if (!apartmentId || !conversationId) {
      throw new Error('apartmentId and conversationId are required');
    }

    console.log('Fetching apartment details for:', apartmentId);
    // Get apartment details
    const { data: apartment, error: apartmentError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', apartmentId)
      .single();

    if (apartmentError) {
      console.error('Error fetching apartment:', apartmentError);
      throw new Error(`Error fetching apartment: ${apartmentError.message}`);
    }

    if (!apartment) {
      throw new Error(`No apartment found with ID: ${apartmentId}`);
    }

    console.log('Fetching messages for conversation:', conversationId);
    // Get conversation messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw new Error(`Error fetching messages: ${messagesError.message}`);
    }

    if (!messages || messages.length === 0) {
      console.log('No messages found for conversation:', conversationId);
    }

    console.log('Fetching FAQs for apartment:', apartmentId);
    // Get FAQs for the apartment
    const { data: faqs, error: faqsError } = await supabase
      .from('faqs')
      .select('question, answer')
      .eq('property_id', apartmentId);

    if (faqsError) {
      console.error('Error fetching FAQs:', faqsError);
      throw new Error(`Error fetching FAQs: ${faqsError.message}`);
    }

    // Prepare context for OpenAI
    const context = `
Apartment Information:
${JSON.stringify(apartment, null, 2)}

FAQs:
${faqs?.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}

Recent Conversation (last 5 messages):
${messages?.slice(-5).map(msg => `${msg.direction === 'inbound' ? 'Guest' : 'Host'}: ${msg.content}`).join('\n')}
`;

    // Create a more detailed system prompt
    const systemPrompt = `You are a professional Airbnb host assistant with the following characteristics:
1. You provide personalized, context-aware responses based on the specific apartment and conversation history
2. You maintain a friendly and professional tone while being concise and helpful
3. You use the apartment's specific details and FAQs to provide accurate information
4. You adapt your response style based on the guest's communication style
5. You avoid generic responses and always try to add value specific to the situation
6. You can suggest multiple response options when appropriate

Current context:
- You are responding to a guest staying at: ${apartment.name}
- The apartment is located at: ${apartment.address}
- The conversation has been ongoing with ${messages?.length || 0} messages exchanged

Please provide a response that is:
1. Specific to this guest's situation
2. Based on the actual conversation history
3. Relevant to the apartment's features and rules
4. Professional yet warm and personal`;

    console.log('Generating AI response with context length:', context.length);
    // Generate AI response with increased temperature for more variety
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: context
        }
      ],
      temperature: 0.8, // Increased for more variety
      max_tokens: 500,
      presence_penalty: 0.6, // Encourage new topics
      frequency_penalty: 0.5, // Reduce repetition
      top_p: 0.9 // Allow for more creative responses
    });

    if (!completion.data.choices || completion.data.choices.length === 0) {
      throw new Error('No response generated from OpenAI');
    }

    const aiResponse = completion.data.choices[0].message.content;
    console.log('Successfully generated AI response');

    // Generate alternative responses if the conversation is longer
    let alternativeResponses = [];
    if (messages && messages.length > 3) {
      const alternativeCompletion = await openai.createChatCompletion({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt + "\n\nPlease provide an alternative response that is different from the first one but equally appropriate."
          },
          {
            role: "user",
            content: context
          }
        ],
        temperature: 0.9,
        max_tokens: 500,
        presence_penalty: 0.7,
        frequency_penalty: 0.6,
        top_p: 0.95
      });

      if (alternativeCompletion.data.choices && alternativeCompletion.data.choices.length > 0) {
        alternativeResponses.push(alternativeCompletion.data.choices[0].message.content);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: [aiResponse, ...alternativeResponses]
      })
    };

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
}; 