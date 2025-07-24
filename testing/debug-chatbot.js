require('dotenv').config();
const axios = require('axios');

async function testChatbotEndpoint() {
  try {
    // First, register and login to get a token
    console.log('1. Registering user...');
    const userData = {
      email: `testuser${Date.now()}@example.com`,
      password: 'TestPassword123!',
      username: `testuser${Date.now()}`,
      full_name: 'Test User'
    };

    const registerResponse = await axios.post('http://localhost:3000/api/auth/register', userData);
    console.log('Register response:', registerResponse.status, registerResponse.data.success);

    if (!registerResponse.data.success || !registerResponse.data.data.token) {
      throw new Error('Registration failed');
    }

    const token = registerResponse.data.data.token;
    console.log('Token obtained:', token.substring(0, 20) + '...');

    // Now test the chatbot endpoint
    console.log('2. Testing chatbot endpoint...');
    const chatbotData = {
      assessment_id: '12345678-1234-1234-1234-123456789012', // dummy UUID
      title: 'Test Conversation',
      auto_start_message: true
    };

    const chatbotResponse = await axios.post(
      'http://localhost:3000/api/chatbot/assessment/from-assessment',
      chatbotData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Chatbot response:', chatbotResponse.status, chatbotResponse.data);

  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
}

testChatbotEndpoint();
