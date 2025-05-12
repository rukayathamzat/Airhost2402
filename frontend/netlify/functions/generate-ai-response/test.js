require('dotenv').config({ path: '.env.local' });
const { handler } = require('./generate-ai-response');

// Debug: Log environment variables
console.log('Environment variables loaded:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set'
});

// Test the function
const testEvent = {
  httpMethod: 'POST',
  body: JSON.stringify({
    apartmentId: 'test-apartment-id',
    conversationId: 'test-conversation-id'
  })
};

handler(testEvent)
  .then(response => {
    console.log('Function response:', response);
  })
  .catch(error => {
    console.error('Function error:', error);
  }); 