const axios = require('axios');

/**
 * Test script for the updated chatbot service with profilePersona functionality
 */

const BASE_URL = 'http://localhost:3006';
const TEST_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwidXNlcl90eXBlIjoicmVndWxhciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTczNzc5NzI0MSwiZXhwIjoxNzM3ODgzNjQxfQ.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E'; // Example token

async function testProfilePersonaConversation() {
  console.log('🧪 Testing Profile Persona Conversation Creation\n');

  try {
    // Test 1: Create conversation with profilePersona
    console.log('📝 Test 1: Create conversation with profilePersona');
    
    const profilePersona = {
      name: "John Doe",
      age: 28,
      personality: "Analytical and detail-oriented",
      interests: ["Technology", "Problem-solving", "Innovation"],
      strengths: ["Critical thinking", "Leadership", "Communication"],
      careerGoals: "Become a senior software architect",
      workStyle: "Collaborative but independent",
      values: ["Growth", "Impact", "Work-life balance"]
    };

    const conversationResponse = await axios.post(
      `${BASE_URL}/conversations`,
      {
        title: "Career Guidance Session",
        profilePersona: profilePersona
      },
      {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (conversationResponse.data.success) {
      console.log('✅ Conversation created successfully');
      console.log('   ID:', conversationResponse.data.data.conversation.id);
      console.log('   Context Type:', conversationResponse.data.data.conversation.context_type);
      console.log('   Has Profile Persona:', !!conversationResponse.data.data.conversation.context_data?.profilePersona);
      
      const conversationId = conversationResponse.data.data.conversation.id;

      // Test 2: Send a message to test system instructions
      console.log('\n💬 Test 2: Send message to test system instructions');
      
      const messageResponse = await axios.post(
        `${BASE_URL}/conversations/${conversationId}/messages`,
        {
          content: "Based on my profile, what career paths would you recommend for me?"
        },
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (messageResponse.data.success) {
        console.log('✅ Message sent and AI response received');
        console.log('   User Message:', messageResponse.data.data.user_message.content);
        console.log('   AI Response:', messageResponse.data.data.assistant_message.content.substring(0, 200) + '...');
        console.log('   Model Used:', messageResponse.data.data.assistant_message.metadata.model);
      } else {
        console.log('❌ Failed to send message:', messageResponse.data.error);
      }

    } else {
      console.log('❌ Failed to create conversation:', conversationResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

async function testGeneralConversation() {
  console.log('\n🧪 Testing General Conversation (without profilePersona)\n');

  try {
    const conversationResponse = await axios.post(
      `${BASE_URL}/conversations`,
      {
        title: "General Chat"
      },
      {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (conversationResponse.data.success) {
      console.log('✅ General conversation created successfully');
      console.log('   Context Type:', conversationResponse.data.data.conversation.context_type);
      console.log('   Has Profile Persona:', !!conversationResponse.data.data.conversation.context_data?.profilePersona);
    } else {
      console.log('❌ Failed to create general conversation:', conversationResponse.data.error);
    }

  } catch (error) {
    console.error('❌ General conversation test failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Profile Persona Tests for Chatbot Service\n');
  
  await testProfilePersonaConversation();
  await testGeneralConversation();
  
  console.log('\n🏁 Tests completed!');
}

// Run tests
runTests().catch(console.error);
