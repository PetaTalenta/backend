# Analisis Endpoint POST /api/chatbot/conversations

**Tanggal**: 29 September 2025  
**Service**: Chatbot Service  
**Endpoint**: POST /api/chatbot/conversations

## Overview

Endpoint ini digunakan untuk membuat conversation (percakapan) baru dengan AI chatbot untuk career guidance. Endpoint ini mendukung berbagai fitur seperti personalisasi dengan profile persona, linking dengan hasil assessment, dan auto-generation initial message.

## Spesifikasi Endpoint

### URL
```
POST /api/chatbot/conversations
```

### Authentication
- **Required**: Bearer Token (JWT)
- **Middleware**: authenticateToken, setUserContext

### Rate Limiting
- Global: 200 requests/15 minutes
- Conversation creation: 100 conversations/day per user

## Request Structure

### Request Body
Semua field dalam request body bersifat **OPTIONAL**:

```json
{
  "title": "string (optional)",
  "resultsId": "UUID string (optional)",
  "profilePersona": "object (optional)",
  "metadata": "object (optional)"
}
```

## Field Analysis & Processing

### 1. Field `title`
- **Tipe**: String
- **Validasi**: Maksimal 255 karakter
- **Default**: "New Conversation" jika tidak disediakan
- **Proses**: Disimpan langsung sebagai title conversation di database
- **Required**: ❌ (Optional)

### 2. Field `resultsId`
- **Tipe**: UUID String
- **Validasi**: Harus berformat UUID yang valid
- **Fungsi**: Menghubungkan conversation dengan hasil analisis assessment
- **Proses**:
  1. Jika disediakan, sistem memanggil `archiveService.updateAnalysisResult(resultsId, conversationId)`
  2. Mengupdate analysis result di archive service dengan `chatbot_id` conversation baru
  3. Jika proses linking gagal, conversation tetap berhasil dibuat (error tidak blocking)
- **Required**: ❌ (Optional)
- **Impact**: Conversation dapat dibuat dengan atau tanpa field ini

### 3. Field `profilePersona`
- **Tipe**: Object
- **Struktur**:
  ```json
{
    "name": "string (optional)",
    "age": "number (optional)",
    "education": "string (optional)",
    "personality": "string (optional)",
    "interests": "array (optional)",
    "strengths": "array (optional)",
    "careerGoals": "string (optional)",
    "workStyle": "string (optional)",
    "values": "array (optional)"
  }
```
- **Validasi**: Harus berupa object yang valid
- **Proses**:
  1. Disimpan dalam `context_data.profilePersona` conversation
  2. Jika ada, sistem otomatis membuat initial message dengan AI
  3. AI generate welcome message berdasarkan profile persona
  4. Initial conversation berisi system prompt + profile persona data
- **Required**: ❌ (Optional)

### 4. Field `metadata`
- **Tipe**: Object
- **Fungsi**: Menyimpan data tambahan
- **Proses**: Disimpan langsung di field metadata conversation
- **Required**: ❌ (Optional)

## Processing Flow

### 1. Request Validation
```javascript
// Menggunakan Joi schema validation
validateBody(schemas.createConversation)
```

### 2. Conversation Creation
```javascript
const conversation = await Conversation.create({
  user_id: userId,
  title: title || 'New Conversation',
  context_type: 'career_guidance',
  context_data: profilePersona ? { profilePersona } : null,
  metadata,
  status: 'active'
});
```

### 3. Initial Message Generation (Conditional)
**Trigger**: Jika `profilePersona` disediakan

**Process**:
1. Buat system messages dengan profile persona context
2. Generate AI response menggunakan OpenRouter Service
3. Simpan user message dan assistant message
4. Track usage dan cost

**System Messages**:
```javascript
const systemMessages = [
  {
    role: 'system',
    content: SYSTEM_PROMPTS.INITIAL_CONVERSATION
  },
  {
    role: 'system',
    content: `Profile Persona Pengguna yang Sudah Dianalisis:\n${JSON.stringify(profilePersona, null, 2)}`
  },
  {
    role: 'user',
    content: 'Halo! Berdasarkan profile persona saya yang sudah dianalisis, bisakah Anda memperkenalkan diri dan memberikan gambaran singkat tentang bagaimana Anda bisa membantu saya dalam pengembangan karir?'
  }
];
```

### 4. Analysis Result Linking (Conditional)
**Trigger**: Jika `resultsId` disediakan

**Process**:
```javascript
if (resultsId) {
  const archiveService = require('../services/archiveService');
  await archiveService.updateAnalysisResult(resultsId, conversation.id);
}
```

**API Call**: PUT `/archive/results/${resultId}` dengan payload `{ chatbot_id: conversationId }`

## Response Structure

### Success Response (201)
```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "conversation": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Career Guidance Session",
      "context_type": "career_guidance",
      "status": "active",
      "context_data": {
        "profilePersona": {...}
      },
      "metadata": {...},
      "createdAt": "2025-09-29T10:00:00.000Z",
      "updatedAt": "2025-09-29T10:00:00.000Z"
    },
    "initial_message": {
      "user_message": {
        "id": "msg-user-001",
        "sender_type": "user",
        "content": "Halo! Berdasarkan profile persona saya...",
        "content_type": "text"
      },
      "assistant_message": {
        "id": "msg-assistant-001",
        "sender_type": "assistant",
        "content": "Halo! Saya adalah Guider, asisten AI...",
        "content_type": "text",
        "metadata": {
          "model": "qwen/qwen-2.5-coder-32b-instruct:free",
          "finish_reason": "stop",
          "processing_time": 1250
        }
      }
    }
  }
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["Results ID must be a valid UUID"]
  }
}
```

#### Authentication Error (401)
```json
{
  "error": "Unauthorized",
  "code": "TOKEN_MISSING"
}
```

## Error Handling

### Non-Blocking Errors
1. **Initial Message Generation Failure**: Conversation tetap dibuat tanpa initial message
2. **Analysis Result Linking Failure**: Conversation tetap dibuat tanpa linking

### Blocking Errors
1. **Validation Errors**: Request ditolak dengan status 400
2. **Authentication Errors**: Request ditolak dengan status 401
3. **Database Errors**: Request ditolak dengan status 500

## Database Impact

### Tables Modified
1. **conversations**: Record baru dibuat
2. **messages**: Jika profilePersona ada, 2 messages dibuat (user + assistant)
3. **usage_tracking**: Jika AI response generated, usage dicatat
4. **archive.analysis_results**: Jika resultsId ada, field chatbot_id diupdate

### Relationships
- Conversation belongs to User (user_id)
- Messages belong to Conversation (conversation_id)
- Analysis Result linked to Conversation (chatbot_id)

## Integration Points

### Internal Services
1. **OpenRouter Service**: AI response generation
2. **Archive Service**: Analysis result linking

### External APIs
1. **OpenRouter API**: AI model inference
2. **Archive Service API**: PUT /archive/results/{id}

## Security Considerations

### Validation
- All input fields validated with Joi schemas
- UUID format validation for resultsId
- String length limits for title (255 chars)
- Content length limits for messages (10,000 chars)

### Rate Limiting
- Global rate limit: 200 requests/15 minutes
- Conversation creation limit: 100/day per user

### Authentication
- Bearer token required
- User context set from token

## Performance Considerations

### Async Operations
- AI response generation (if profilePersona provided)
- Archive service API call (if resultsId provided)
- Database operations

### Timeouts
- OpenRouter API calls have timeout configurations
- Archive service calls have error handling

## Usage Examples

### Minimal Request
```bash
curl -X POST https://api.futureguide.id/api/chatbot/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Full Request with Profile Persona
```bash
curl -X POST https://api.futureguide.id/api/chatbot/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Career Guidance Session",
    "resultsId": "550e8400-e29b-41d4-a716-446655440000",
    "profilePersona": {
      "name": "John Doe",
      "age": 25,
      "education": "Computer Science",
      "personality": "INTJ",
      "interests": ["Technology", "Problem Solving"],
      "strengths": ["Analytical Thinking", "Leadership"],
      "careerGoals": "Become a Tech Lead",
      "workStyle": "Independent",
      "values": ["Innovation", "Growth"]
    },
    "metadata": {
      "source": "assessment_completion"
    }
  }'
```

### Request with Results ID Only
```bash
curl -X POST https://api.futureguide.id/api/chatbot/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Post-Assessment Discussion",
    "resultsId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

## Kesimpulan

Endpoint POST /api/chatbot/conversations adalah endpoint yang sangat fleksibel dengan semua field bersifat optional. Field `resultsId` **tidak wajib dikirim** dan conversation dapat dibuat dengan sukses tanpa field ini. 

### Key Points:
1. **Semua field optional** - endpoint dapat dipanggil dengan request body kosong
2. **resultsId tidak wajib** - berfungsi untuk linking dengan assessment results
3. **profilePersona memicu initial message** - AI akan generate welcome message
4. **Error handling robust** - gagal link/generate message tidak menghalangi pembuatan conversation
5. **Rate limiting applied** - ada batasan per user dan global
6. **Security validated** - semua input divalidasi dan authenticated

Endpoint ini dirancang untuk memberikan fleksibilitas maksimal dalam pembuatan conversation sambil tetap menjaga keamanan dan performa sistem.
# Analisis Endpoint POST /api/chatbot/conversations

**Tanggal**: 29 September 2025  
**Service**: Chatbot Service  
**Endpoint**: POST /api/chatbot/conversations

## Overview

Endpoint ini digunakan untuk membuat conversation (percakapan) baru dengan AI chatbot untuk career guidance. Endpoint ini mendukung berbagai fitur seperti personalisasi dengan profile persona, linking dengan hasil assessment, dan auto-generation initial message.

## Spesifikasi Endpoint

### URL
```
POST /api/chatbot/conversations
```

### Authentication
- **Required**: Bearer Token (JWT)
- **Middleware**: authenticateToken, setUserContext

### Rate Limiting
- Global: 200 requests/15 minutes
- Conversation creation: 100 conversations/day per user

## Request Structure

### Request Body
Semua field dalam request body bersifat **OPTIONAL**:

```json
{
  "title": "string (optional)",
  "resultsId": "UUID string (optional)",
  "profilePersona": "object (optional)",
  "metadata": "object (optional)"
}
```

## Field Analysis & Processing

### 1. Field `title`
- **Tipe**: String
- **Validasi**: Maksimal 255 karakter
- **Default**: "New Conversation" jika tidak disediakan
- **Proses**: Disimpan langsung sebagai title conversation di database
- **Required**: ❌ (Optional)

### 2. Field `resultsId`
- **Tipe**: UUID String
- **Validasi**: Harus berformat UUID yang valid
- **Fungsi**: Menghubungkan conversation dengan hasil analisis assessment
- **Proses**:
  1. Jika disediakan, sistem memanggil `archiveService.updateAnalysisResult(resultsId, conversationId)`
  2. Mengupdate analysis result di archive service dengan `chatbot_id` conversation baru
  3. Jika proses linking gagal, conversation tetap berhasil dibuat (error tidak blocking)
- **Required**: ❌ (Optional)
- **Impact**: Conversation dapat dibuat dengan atau tanpa field ini

### 3. Field `profilePersona`
- **Tipe**: Object
- **Struktur**:
  ```json
  {
    "name": "string (optional)",
    "age": "number (optional)",
    "education": "string (optional)",
    "personality": "string (optional)",
    "interests": "array (optional)",
    "strengths": "array (optional)",
    "careerGoals": "string (optional)",
    "workStyle": "string (optional)",
    "values": "array (optional)"
  }
  ```
- **Validasi**: Harus berupa object yang valid
- **Proses**:
  1. Disimpan dalam `context_data.profilePersona` conversation
  2. Jika ada, sistem otomatis membuat initial message dengan AI
  3. AI generate welcome message berdasarkan profile persona
  4. Initial conversation berisi system prompt + profile persona data
- **Required**: ❌ (Optional)

### 4. Field `metadata`
- **Tipe**: Object
- **Fungsi**: Menyimpan data tambahan
- **Proses**: Disimpan langsung di field metadata conversation
- **Required**: ❌ (Optional)

## Processing Flow

### 1. Request Validation
```javascript
// Menggunakan Joi schema validation
validateBody(schemas.createConversation)
```

### 2. Conversation Creation
```javascript
const conversation = await Conversation.create({
  user_id: userId,
  title: title || 'New Conversation',
  context_type: 'career_guidance',
  context_data: profilePersona ? { profilePersona } : null,
  metadata,
  status: 'active'
});
```

### 3. Initial Message Generation (Conditional)
**Trigger**: Jika `profilePersona` disediakan

**Process**:
1. Buat system messages dengan profile persona context
2. Generate AI response menggunakan OpenRouter Service
3. Simpan user message dan assistant message
4. Track usage dan cost

**System Messages**:
```javascript
const systemMessages = [
  {
    role: 'system',
    content: SYSTEM_PROMPTS.INITIAL_CONVERSATION
  },
  {
    role: 'system',
    content: `Profile Persona Pengguna yang Sudah Dianalisis:\n${JSON.stringify(profilePersona, null, 2)}`
  },
  {
    role: 'user',
    content: 'Halo! Berdasarkan profile persona saya yang sudah dianalisis, bisakah Anda memperkenalkan diri dan memberikan gambaran singkat tentang bagaimana Anda bisa membantu saya dalam pengembangan karir?'
  }
];
```

### 4. Analysis Result Linking (Conditional)
**Trigger**: Jika `resultsId` disediakan

**Process**:
```javascript
if (resultsId) {
  const archiveService = require('../services/archiveService');
  await archiveService.updateAnalysisResult(resultsId, conversation.id);
}
```

**API Call**: PUT `/archive/results/${resultId}` dengan payload `{ chatbot_id: conversationId }`

## Response Structure

### Success Response (201)
```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "conversation": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Career Guidance Session",
      "context_type": "career_guidance",
      "status": "active",
      "context_data": {
        "profilePersona": {...}
      },
      "metadata": {...},
      "createdAt": "2025-09-29T10:00:00.000Z",
      "updatedAt": "2025-09-29T10:00:00.000Z"
    },
    "initial_message": {
      "user_message": {
        "id": "msg-user-001",
        "sender_type": "user",
        "content": "Halo! Berdasarkan profile persona saya...",
        "content_type": "text"
      },
      "assistant_message": {
        "id": "msg-assistant-001",
        "sender_type": "assistant",
        "content": "Halo! Saya adalah Guider, asisten AI...",
        "content_type": "text",
        "metadata": {
          "model": "qwen/qwen-2.5-coder-32b-instruct:free",
          "finish_reason": "stop",
          "processing_time": 1250
        }
      }
    }
  }
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["Results ID must be a valid UUID"]
  }
}
```

#### Authentication Error (401)
```json
{
  "error": "Unauthorized",
  "code": "TOKEN_MISSING"
}
```

## Error Handling

### Non-Blocking Errors
1. **Initial Message Generation Failure**: Conversation tetap dibuat tanpa initial message
2. **Analysis Result Linking Failure**: Conversation tetap dibuat tanpa linking

### Blocking Errors
1. **Validation Errors**: Request ditolak dengan status 400
2. **Authentication Errors**: Request ditolak dengan status 401
3. **Database Errors**: Request ditolak dengan status 500

## Database Impact

### Tables Modified
1. **conversations**: Record baru dibuat
2. **messages**: Jika profilePersona ada, 2 messages dibuat (user + assistant)
3. **usage_tracking**: Jika AI response generated, usage dicatat
4. **archive.analysis_results**: Jika resultsId ada, field chatbot_id diupdate

### Relationships
- Conversation belongs to User (user_id)
- Messages belong to Conversation (conversation_id)
- Analysis Result linked to Conversation (chatbot_id)

## Integration Points

### Internal Services
1. **OpenRouter Service**: AI response generation
2. **Archive Service**: Analysis result linking

### External APIs
1. **OpenRouter API**: AI model inference
2. **Archive Service API**: PUT /archive/results/{id}

## Security Considerations

### Validation
- All input fields validated with Joi schemas
- UUID format validation for resultsId
- String length limits for title (255 chars)
- Content length limits for messages (10,000 chars)

### Rate Limiting
- Global rate limit: 200 requests/15 minutes
- Conversation creation limit: 100/day per user

### Authentication
- Bearer token required
- User context set from token

## Performance Considerations

### Async Operations
- AI response generation (if profilePersona provided)
- Archive service API call (if resultsId provided)
- Database operations

### Timeouts
- OpenRouter API calls have timeout configurations
- Archive service calls have error handling

## Usage Examples

### Minimal Request
```bash
curl -X POST https://api.futureguide.id/api/chatbot/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Full Request with Profile Persona
```bash
curl -X POST https://api.futureguide.id/api/chatbot/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Career Guidance Session",
    "resultsId": "550e8400-e29b-41d4-a716-446655440000",
    "profilePersona": {
      "name": "John Doe",
      "age": 25,
      "education": "Computer Science",
      "personality": "INTJ",
      "interests": ["Technology", "Problem Solving"],
      "strengths": ["Analytical Thinking", "Leadership"],
      "careerGoals": "Become a Tech Lead",
      "workStyle": "Independent",
      "values": ["Innovation", "Growth"]
    },
    "metadata": {
      "source": "assessment_completion"
    }
  }'
```

### Request with Results ID Only
```bash
curl -X POST https://api.futureguide.id/api/chatbot/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Post-Assessment Discussion",
    "resultsId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

## Kesimpulan

Endpoint POST /api/chatbot/conversations adalah endpoint yang sangat fleksibel dengan semua field bersifat optional. Field `resultsId` **tidak wajib dikirim** dan conversation dapat dibuat dengan sukses tanpa field ini. 

### Key Points:
1. **Semua field optional** - endpoint dapat dipanggil dengan request body kosong
2. **resultsId tidak wajib** - berfungsi untuk linking dengan assessment results
3. **profilePersona memicu initial message** - AI akan generate welcome message
4. **Error handling robust** - gagal link/generate message tidak menghalangi pembuatan conversation
5. **Rate limiting applied** - ada batasan per user dan global
6. **Security validated** - semua input divalidasi dan authenticated

Endpoint ini dirancang untuk memberikan fleksibilitas maksimal dalam pembuatan conversation sambil tetap menjaga keamanan dan performa sistem.
