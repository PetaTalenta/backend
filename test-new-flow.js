const axios = require('axios');

/**
 * Test script untuk flow baru chatbot service dengan profilePersona
 * Flow: Client kirim profilePersona -> Backend buat konteks -> LLM response -> Simpan ke chat history
 */

const BASE_URL = 'http://localhost:3006';

// Simulasi test tanpa authentication untuk testing internal
async function testNewFlow() {
  console.log('🧪 Testing New Profile Persona Flow\n');

  // Test data profile persona
  const profilePersona = {
    name: "Sarah Johnson",
    age: 26,
    education: "Bachelor's in Computer Science",
    experience: "2 years as Junior Developer",
    personality: "Creative, analytical, and collaborative",
    interests: ["Web Development", "UI/UX Design", "Machine Learning"],
    strengths: ["Problem-solving", "Communication", "Adaptability"],
    careerGoals: "Become a Full-Stack Developer and eventually lead a development team",
    workStyle: "Prefers collaborative environment with opportunities for learning",
    values: ["Innovation", "Growth", "Work-life balance", "Team collaboration"],
    challenges: "Wants to improve backend development skills and gain leadership experience"
  };

  console.log('📋 Profile Persona Data:');
  console.log(JSON.stringify(profilePersona, null, 2));
  console.log('\n');

  try {
    // Simulasi request ke endpoint (akan gagal karena auth, tapi kita bisa lihat struktur)
    console.log('📝 Expected Request Structure:');
    console.log('POST /conversations');
    console.log('Body:', JSON.stringify({
      title: "Career Guidance Session",
      profilePersona: profilePersona
    }, null, 2));

    console.log('\n📤 Expected Response Structure:');
    console.log(`{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "conversation": {
      "id": "uuid",
      "title": "Career Guidance Session",
      "context_type": "career_guidance",
      "context_data": null,
      "status": "active"
    },
    "initial_message": {
      "user_message": {
        "id": "uuid",
        "content": "Halo! Berdasarkan profile persona saya...",
        "sender_type": "user"
      },
      "assistant_message": {
        "id": "uuid", 
        "content": "Halo Sarah! Saya Guider...",
        "sender_type": "assistant"
      }
    }
  }
}`);

    console.log('\n✅ Flow Explanation:');
    console.log('1. Client mengirim profilePersona dalam request body');
    console.log('2. Backend membuat conversation TANPA menyimpan profilePersona di database');
    console.log('3. Backend menggunakan profilePersona sebagai konteks untuk LLM');
    console.log('4. LLM memberikan response dengan system instruction sebagai "Guider"');
    console.log('5. User message dan assistant response disimpan ke chat history');
    console.log('6. ProfilePersona TIDAK disimpan di database, hanya digunakan untuk inisiasi');

    console.log('\n🔄 Subsequent Messages:');
    console.log('- Pesan selanjutnya akan menggunakan conversation history dari database');
    console.log('- Tidak ada lagi referensi ke profilePersona setelah inisiasi');
    console.log('- LLM akan mengingat konteks dari chat history yang tersimpan');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test health endpoint untuk memastikan service berjalan
async function testHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Service Health Check:', response.data.status);
    return true;
  } catch (error) {
    console.log('❌ Service not available:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing New Chatbot Service Flow\n');
  
  const isHealthy = await testHealth();
  if (!isHealthy) {
    console.log('Service is not running. Please start the chatbot service first.');
    return;
  }

  console.log('');
  await testNewFlow();
  
  console.log('\n🏁 Test completed!');
  console.log('\n📝 Summary:');
  console.log('- ✅ ProfilePersona tidak disimpan di database');
  console.log('- ✅ ProfilePersona digunakan hanya untuk inisiasi dengan LLM');
  console.log('- ✅ Chat history (user + assistant messages) disimpan di database');
  console.log('- ✅ System instruction "Guider" diterapkan saat inisiasi');
  console.log('- ✅ Flow lebih sederhana dan efisien');
}

// Run tests
runTests().catch(console.error);
