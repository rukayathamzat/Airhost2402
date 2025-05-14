const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
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

Recent Conversation:
${messages?.map(msg => `${msg.direction === 'inbound' ? 'Guest' : 'Host'}: ${msg.content}`).join('\n')}
`;

    console.log('Generating AI response with context length:', context.length);
    // Generate AI response
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful Airbnb host assistant. Respond professionally and friendly. Use the provided apartment information and FAQs to give accurate answers."
        },
        {
          role: "user",
          content: context
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    if (!completion.data.choices || completion.data.choices.length === 0) {
      throw new Error('No response generated from OpenAI');
    }

    const aiResponse = completion.data.choices[0].message.content;
    console.log('Successfully generated AI response');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: aiResponse
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