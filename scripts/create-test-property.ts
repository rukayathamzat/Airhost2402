import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestProperty() {
  const { data, error } = await supabase
    .from('properties')
    .insert([
      {
        name: 'Test Property WhatsApp',
        host_id: '7d3ca44d-f2d2-4109-8885-8ef004ee63ff'
      }
    ])
    .select()

  if (error) {
    console.error('Error creating property:', error)
    process.exit(1)
  }

  console.log('Created test property:', data)
}

createTestProperty()
