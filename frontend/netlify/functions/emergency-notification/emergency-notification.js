const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

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

    const { propertyId, emergencyDetails } = JSON.parse(event.body);

    if (!propertyId || !emergencyDetails) {
      throw new Error('propertyId and emergencyDetails are required');
    }

    // Get property manager contact information
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('manager_email, manager_phone, name')
      .eq('id', propertyId)
      .single();

    if (propertyError) {
      throw new Error(`Error fetching property: ${propertyError.message}`);
    }

    if (!property) {
      throw new Error(`No property found with ID: ${propertyId}`);
    }

    // Create notification record
    const { data: notification, error: notificationError } = await supabase
      .from('emergency_notifications')
      .insert({
        property_id: propertyId,
        manager_email: property.manager_email,
        manager_phone: property.manager_phone,
        emergency_details: emergencyDetails,
        status: 'pending'
      })
      .select()
      .single();

    if (notificationError) {
      throw new Error(`Error creating notification: ${notificationError.message}`);
    }

    // Send email notification
    const emailContent = `
      EMERGENCY ALERT - ${property.name}
      
      Severity: ${emergencyDetails.severity.toUpperCase()}
      Message: ${emergencyDetails.message}
      Detected Keywords: ${emergencyDetails.detectedKeywords.join(', ')}
      
      Please take immediate action if necessary.
      
      This is an automated message from your property management system.
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: property.manager_email,
      subject: `EMERGENCY ALERT - ${property.name}`,
      text: emailContent
    });

    // Update notification status
    await supabase
      .from('emergency_notifications')
      .update({ status: 'sent' })
      .eq('id', notification.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Emergency notification sent successfully',
        notificationId: notification.id
      })
    };

  } catch (error) {
    console.error('Error in emergency notification:', error);

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