# Chatbot Service - Archetype Response Investigation Report

**Date**: September 29, 2025  
**Investigator**: GitHub Copilot  
**Issue**: Chatbot memberikan jawaban tidak jelas ketika user bertanya tentang archetype dirinya  

---

## 🔍 Executive Summary

Investigasi terhadap chatbot service mengungkap bahwa respons yang tidak jelas tentang archetype user disebabkan oleh **masalah dalam penyediaan konteks profile persona** pada saat inisiasi conversation. Meskipun sistem telah dirancang untuk menerima `profilePersona` data, dalam praktiknya data ini seringkali tidak tersedia atau tidak lengkap saat user mengajukan pertanyaan tentang archetype mereka.

##  Findings

### 1. **Logs Analysis**
- ❌ **Tidak ditemukan log conversation aktual** di `chatbot-service/logs/`
- Hanya ditemukan health check requests dan metrics summary
- Log hanya menunjukkan 0 messages received/sent dalam metrics
- Ini menunjukkan **tidak ada aktivitas conversation real** yang tercatat

### 2. **Context Service Analysis**
**Lokasi**: `/chatbot-service/src/services/contextService.js`

**Temuan**:
- ✅ Context service sudah dirancang dengan baik untuk career guidance
- ✅ Sistem prompt CAREER_GUIDER sudah mencakup instruksi khusus untuk archetype questions:
  ```javascript
"Jika ditanya 'apa archetype saya?', rujuk jawabanmu pada konteks profile persona yang diberikan. 
   Jika informasi tersebut tidak ada, jawab dengan jujur bahwa kamu tidak memiliki data tersebut."
```
- ❌ **Tidak ada mekanisme untuk mengambil profile persona dari archive service** dalam buildConversationContext()

### 3. **Conversation Initiation Analysis**
**Lokasi**: `/chatbot-service/src/controllers/conversationController.js`

**Temuan**:
- ✅ Endpoint POST `/conversations` dapat menerima parameter `profilePersona`
- ✅ Jika `profilePersona` tersedia, sistem membuat initial message dengan context yang tepat
- ❌ **ProfilePersona tidak disimpan ke conversation.context_data** untuk digunakan nanti
- ❌ **Client bertanggung jawab mengirim profilePersona** - jika tidak dikirim, bot tidak memiliki context

### 4. **Archive Service Integration**
**Lokasi**: `/chatbot-service/src/services/archiveService.js`

**Temuan**:
- ✅ Archive service integration sudah tersedia dan lengkap
- ✅ Method `getAssessmentById()` dan `getUserLatestAssessment()` sudah ada
- ❌ **Tidak digunakan dalam context building** untuk archetype questions
- ❌ **Tidak ada fallback mechanism** untuk mengambil profile persona saat dibutuhkan

### 5. **Message Processing Flow**
**Lokasi**: `/chatbot-service/src/controllers/messageController.js`

**Alur saat user bertanya archetype**:
1. User mengirim pesan "apa archetype saya?"
2. `buildConversationContext()` dipanggil
3. Context hanya berisi conversation history + system prompts
4. **Profile persona TIDAK otomatis diambil dari archive service**
5. LLM merespons tanpa informasi archetype yang spesifik
6. Respons menjadi generic/tidak jelas

## 🔧 Root Cause Analysis

### **Primary Issue**: Missing Profile Persona Context
- **ProfilePersona tidak disimpan** di conversation.context_data saat create conversation
- **Context service tidak mengambil profile persona** saat membangun context
- **Tidak ada fallback mechanism** jika profilePersona tidak tersedia

### **Secondary Issues**:
1. **Logging insufficiency** - tidak ada log conversation aktual untuk debugging
2. **Integration gap** - archive service tidak terintegrasi dalam message processing flow
3. **Context optimization** - tidak ada caching mechanism untuk profile persona per conversation

## 💡 Recommendations

### **1. Immediate Fix: Store ProfilePersona in Conversation**
Modifikasi `conversationController.js` untuk menyimpan profilePersona:

```javascript
// Di createConversation()
const conversation = await Conversation.create({
  user_id: userId,
  title: title || 'New Conversation',
  context_type: 'career_guidance',
  context_data: profilePersona ? { profilePersona } : null, // 🔥 SIMPAN profilePersona
  metadata,
  status: 'active'
});
```

### **2. Context Service Enhancement with Smart Fallback**
Modifikasi `contextService.js` untuk menggunakan priority system:

```javascript
// Di buildConversationContext()
async buildConversationContext(conversationId, options = {}) {
  try {
    const conversation = await Conversation.findByPk(conversationId);
    
    // Get conversation history
    const messages = await this.getConversationHistory(conversationId, options);
    
    // Smart profile persona retrieval dengan priority system
    let profilePersonaContext = '';
    
    if (conversation.context_type === 'career_guidance') {
      // Priority 1: Use profile persona dari conversation (jika client sudah kirim saat create)
      if (conversation.context_data && conversation.context_data.profilePersona) {
        profilePersonaContext = `Profile Persona Pengguna:\n${JSON.stringify(conversation.context_data.profilePersona, null, 2)}`;
        logger.info('Using profile persona from conversation context', { conversationId });
      }
      // Priority 2: Fallback ke archive service HANYA jika client tidak kirim
      else {
        logger.warn('No profile persona in conversation, attempting archive service fallback', { conversationId });
        const archiveService = require('./archiveService');
        const profilePersona = await archiveService.getUserLatestAssessment(conversation.user_id);
        
        if (profilePersona && profilePersona.persona_profile) {
          profilePersonaContext = `Profile Persona Pengguna (from archive fallback):\n${JSON.stringify(profilePersona.persona_profile, null, 2)}`;
          logger.info('Using profile persona from archive service fallback', { conversationId });
        } else {
          logger.warn('No profile persona available from any source', { conversationId });
        }
      }
    }
    
    // Build context with persona
    const context = [
      { role: 'system', content: this.getSystemPrompt(conversation.context_type) },
      { role: 'system', content: this.getReinforceInstructions() }
    ];
    
    // Add profile persona context if available
    if (profilePersonaContext) {
      context.push({ role: 'system', content: profilePersonaContext });
    }
    
    context.push(...messages);
    
    return context;
  } catch (error) {
    logger.error('Error building conversation context', {
      conversationId,
      error: error.message
    });
    throw error;
  }
}
```

### **3. Enhanced Archetype Question Detection**
Tambahkan logging khusus di `messageController.js`:

```javascript
// Detect archetype questions untuk monitoring
const isArchetypeQuestion = /apa archetype|archetype saya|tipe kepribadian|personality type/i.test(content);

if (isArchetypeQuestion) {
  logger.info('ARCHETYPE QUESTION DETECTED', {
    conversationId,
    userId,
    question: content.substring(0, 100),
    hasConversationPersona: !!(conversation.context_data?.profilePersona),
    conversationContextType: conversation.context_type
  });
}
```

### **4. Client-Side Best Practice**
Pastikan frontend mengirim `profilePersona` saat create conversation:

```javascript
// Frontend best practice
const createConversationWithPersona = async () => {
  // Get user's latest assessment result
  const userResult = await getUserLatestAssessment();
  
  const conversationData = {
    title: "Career Guidance Session",
    profilePersona: userResult.persona_profile, // 🔥 ALWAYS send this
    resultsId: userResult.id
  };
  
  return await createConversation(conversationData);
};
```

## 🧪 Testing Recommendations

### **Test Scenarios**:
1. **Happy Path**: Create conversation WITH profilePersona → ask archetype → should get specific answer
2. **Fallback Path**: Create conversation WITHOUT profilePersona → ask archetype → should fallback to archive service
3. **No Data Path**: User belum punya assessment → ask archetype → should explain no data available  
4. **Error Path**: Archive service down → fallback fails → should gracefully handle

### **Test Data**:
```javascript
const testArchetypeQuestions = [
  "apa archetype saya?",
  "archetype saya apa?", 
  "tipe kepribadian saya apa?",
  "jelaskan archetype kepribadian saya",
  "what is my personality type?"
];

const testScenarios = [
  { name: "With ProfilePersona", hasPersona: true, expectedResponse: "specific archetype info" },
  { name: "Fallback to Archive", hasPersona: false, hasArchiveData: true, expectedResponse: "specific archetype from archive" },
  { name: "No Data Available", hasPersona: false, hasArchiveData: false, expectedResponse: "honest no data response" }
];
```

## 📈 Impact Assessment

### **Before Fix**:
- ❌ User bertanya archetype → Generic/unclear response
- ❌ ProfilePersona tidak disimpan/digunakan dengan optimal
- ❌ Tidak ada fallback mechanism
- ❌ Poor debugging capability

### **After Fix**:
- ✅ User bertanya archetype → Specific response berdasarkan assessment
- ✅ ProfilePersona disimpan dan digunakan secara konsisten
- ✅ Smart fallback ke archive service jika diperlukan
- ✅ Better logging untuk debugging
- ✅ Optimal user experience

## 📋 Implementation Priority

### **High Priority** (Immediate):
1. 🔥 **Store profilePersona di conversation.context_data** 
2. 🔥 **Context service enhancement dengan smart fallback**
3. 🔥 **Enhanced logging untuk archetype questions**

### **Medium Priority** (Next Sprint):
1. 🔄 Client-side integration improvement
2. 🔄 Error handling enhancement 
3. 🔄 Performance monitoring

### **Low Priority** (Future):
1. 📝 Caching mechanism untuk frequent queries
2. 📝 Advanced context management
3. 📝 Multi-assessment support

---

## 📝 Conclusion

**Key insight**: Jika client sudah memberikan `profilePersona`, sistem harus **menyimpan dan menggunakan** data tersebut secara konsisten. Archive service fallback hanya digunakan sebagai **backup mechanism** jika client tidak mengirim profilePersona.

**Prioritas utama**:
1. **Store profilePersona** dalam conversation.context_data
2. **Smart context building** dengan priority system
3. **Fallback mechanism** untuk coverage maksimal

Implementasi ini akan memberikan **user experience yang optimal** dengan **efficient resource usage** - tidak perlu hit archive service jika data sudah tersedia dari client.
