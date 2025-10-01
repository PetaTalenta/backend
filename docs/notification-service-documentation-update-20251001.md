# Documentation Update: Notification Service

**Tanggal:** 1 Oktober 2025  
**File:** `/documentation-service/src/data/notification-service.js`  
**Status:** ✅ UPDATED

---

## 📋 Summary

Dokumentasi Notification Service telah di-update secara komprehensif untuk memastikan Frontend Developer memiliki panduan lengkap dan akurat dalam mengimplementasikan real-time notifications.

---

## 🔧 Perubahan Utama

### 1. Status Values Correction

**Sebelum:**
```javascript
// ❌ Salah - menggunakan bahasa Indonesia
analysis-complete: { status: "berhasil" }
analysis-failed: { status: "gagal" }
analysis-started: { status: "started" }
```

**Sesudah:**
```javascript
// ✅ Benar - sesuai database schema
analysis-complete: { status: "completed" }
analysis-failed: { status: "failed" }
analysis-started: { status: "processing" }
```

### 2. Enhanced Data Fields

**analysis-started event:**
```javascript
{
  jobId: "uuid",
  resultId: "uuid",           // ✅ Added
  status: "processing",       // ✅ Fixed
  assessment_name: "string",
  message: "string",
  estimated_time: "1-3 minutes", // ✅ Added
  timestamp: "ISO-8601"
}
```

---

## 🆕 Konten Baru yang Ditambahkan

### 1. Complete React Implementation (TypeScript)

**Fitur:**
- ✅ Full TypeScript types & interfaces
- ✅ Custom React Hook: `useNotificationService`
- ✅ Context Provider pattern
- ✅ Auto-reconnection logic
- ✅ Token refresh handling
- ✅ Error boundary
- ✅ Notification persistence

**File Structure:**
```typescript
types/notification.ts           // Type definitions
hooks/useNotificationService.ts // Main hook
components/NotificationProvider.tsx
components/NotificationDisplay.tsx
```

**Code Highlights:**
```typescript
// Type-safe notification handling
export interface NotificationData {
  jobId?: string;
  resultId?: string | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  assessment_name: string;
  // ... more fields
}

// Auto-reconnection with retry limit
reconnectionAttempts: 5,
reconnectionDelay: 1000,
reconnectionDelayMax: 5000
```

---

### 2. Status Values Reference

Penjelasan detail untuk setiap status value:

| Status | Description | Source | UI Suggestion |
|--------|-------------|--------|---------------|
| `queued` | Job waiting in queue | Initial submission | Loading with "Queued" |
| `processing` | Job being analyzed | `analysis-started` event | Progress with estimated time |
| `completed` | Success with results | `analysis-complete` event | Success + redirect to results |
| `failed` | Job failed | `analysis-failed` event | Error + retry option |

**Code Example:**
```javascript
const handleNotificationStatus = (status, data) => {
  switch(status) {
    case 'queued':
      showMessage('Your assessment is queued', 'info');
      break;
    case 'processing':
      showMessage(`Processing... ${data.estimated_time}`, 'info');
      break;
    case 'completed':
      navigateToResults(data.result_id);
      break;
    case 'failed':
      showError(data.error_message);
      break;
  }
};
```

---

### 3. Best Practices Section

**a. Connection Management**
```javascript
// Proper reconnection strategy
const socket = io('https://api.futureguide.id', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('reconnect', (attemptNumber) => {
  // Re-authenticate after reconnection
  socket.emit('authenticate', { token: getAuthToken() });
});
```

**b. Token Refresh Handling**
```javascript
socket.on('auth_error', async (error) => {
  if (error.message.includes('expired')) {
    const newToken = await refreshAuthToken();
    socket.emit('authenticate', { token: newToken });
  }
});
```

**c. Notification Persistence**
```javascript
// Save to localStorage for offline viewing
const saveNotification = (notification) => {
  const stored = JSON.parse(localStorage.getItem('notifications') || '[]');
  stored.unshift({ ...notification, receivedAt: new Date() });
  localStorage.setItem('notifications', JSON.stringify(stored.slice(0, 50)));
};
```

**d. Fallback to Polling**
```javascript
// Graceful degradation when WebSocket fails
socket.on('connect_error', (error) => {
  if (error.context?.attempts >= 3) {
    startPolling(); // Fall back to REST API polling
  }
});
```

---

### 4. UI/UX Guidelines

**Status Colors & Icons:**
```javascript
const statusConfig = {
  queued: {
    color: "#6B7280",  // Gray
    icon: "clock"
  },
  processing: {
    color: "#3B82F6",  // Blue
    icon: "spinner",
    animate: true
  },
  completed: {
    color: "#10B981",  // Green
    icon: "check-circle"
  },
  failed: {
    color: "#EF4444",  // Red
    icon: "x-circle"
  }
};
```

**React StatusBadge Component:**
```typescript
<StatusBadge status="processing" />
// Renders: [🔄] Processing (with blue background)

<StatusBadge status="completed" showIcon={false} />
// Renders: Completed (text only, green background)
```

**Tailwind CSS Classes:**
```css
.status-queued { @apply bg-gray-100 text-gray-800; }
.status-processing { @apply bg-blue-100 text-blue-800; }
.status-completed { @apply bg-green-100 text-green-800; }
.status-failed { @apply bg-red-100 text-red-800; }
```

---

### 5. Translation Mapping

**Multi-language Support:**
```javascript
export const statusTranslations = {
  en: {
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed'
  },
  id: {
    queued: 'Dalam Antrian',
    processing: 'Sedang Diproses',
    completed: 'Selesai',
    failed: 'Gagal'
  }
};

// Usage
const getStatusText = (status, language = 'id') => {
  return statusTranslations[language][status];
};
```

**⚠️ PENTING:**
- Translation **HANYA** untuk display di UI
- API communication tetap menggunakan English status values
- **JANGAN** translate status values dalam API requests/responses

---

### 6. API Consistency Notes

**Why English Status Values?**
1. ✅ **Database Constraint:** Status values are enforced at database level
2. ✅ **Cross-Service Consistency:** All services use the same status values
3. ✅ **API Comparison:** Easy to compare status from different endpoints
4. ✅ **Standard Practice:** English is standard for internal system constants

**Comparison Example:**
```javascript
// ✅ CORRECT: Status from different sources match
const apiStatus = await fetch('/api/assessment/status/job-id');
// apiStatus.data.status = "completed"

socket.on('analysis-complete', (notification) => {
  // notification.status = "completed"
  if (notification.status === apiStatus.data.status) {
    // ✅ This works! Both use "completed"
  }
});

// ❌ WRONG: Don't expect translated values
if (notification.status === 'berhasil') {
  // ❌ This will NEVER match!
}
```

**Common Mistakes to Avoid:**
```javascript
// ❌ WRONG: Translating in API request
fetch('/api/assessment/submit', {
  body: JSON.stringify({
    status: 'dalam antrian'  // ❌ Wrong!
  })
});

// ✅ CORRECT: Use English constant
fetch('/api/assessment/submit', {
  body: JSON.stringify({
    status: 'queued'  // ✅ Correct!
  })
});

// ✅ CORRECT: Translate only for display
const displayText = translateStatus(data.status, 'id');
// data.status = "completed" (for API)
// displayText = "Selesai" (for UI)
```

---

## 📊 Status Value Mapping

| Database | API/WebSocket | Display (EN) | Display (ID) |
|----------|---------------|--------------|--------------|
| `queued` | `queued` | Queued | Dalam Antrian |
| `processing` | `processing` | Processing | Sedang Diproses |
| `completed` | `completed` | Completed | Selesai |
| `failed` | `failed` | Failed | Gagal |

---

## 🎯 Untuk Frontend Developer

### Quick Start Checklist

- [ ] Install `socket.io-client` package
- [ ] Copy TypeScript types from documentation
- [ ] Implement `useNotificationService` hook
- [ ] Create `NotificationProvider` context
- [ ] Add `NotificationDisplay` component
- [ ] Setup status translation mapping
- [ ] Implement StatusBadge component
- [ ] Add error handling & reconnection
- [ ] Test with real assessment submission

### Key Points to Remember

1. **Status Values are English Constants**
   - Never translate status in API communication
   - Translation only for UI display

2. **Always Authenticate Within 10 Seconds**
   - Emit `authenticate` event after connection
   - Handle `auth_error` for token refresh

3. **Handle All Status Values**
   - `queued`, `processing`, `completed`, `failed`
   - Provide appropriate UI feedback for each

4. **Implement Reconnection Logic**
   - Auto-reconnect on disconnect
   - Re-authenticate after reconnection

5. **Graceful Degradation**
   - Fall back to polling if WebSocket fails
   - Show connection status to user

---

## 📝 Documentation Sections

Dokumentasi lengkap sekarang mencakup:

1. ✅ **WebSocket Connection** - Connection flow & authentication
2. ✅ **Events Reference** - All event types with examples
3. ✅ **Complete React Implementation** - Full TypeScript code
4. ✅ **Status Values Reference** - Detailed status explanation
5. ✅ **Best Practices** - Production-ready patterns
6. ✅ **UI/UX Guidelines** - Component examples & styling
7. ✅ **Translation Mapping** - Multi-language support
8. ✅ **API Consistency** - Cross-service comparison
9. ✅ **Troubleshooting** - Common issues & solutions

---

## 🔗 Access Documentation

- **File:** `/documentation-service/src/data/notification-service.js`
- **Online:** `https://api.futureguide.id/docs` (after deploy)
- **Local:** Import dari documentation service

---

## ✅ Verification

- ✅ All status values updated to match database
- ✅ Complete TypeScript implementation provided
- ✅ Best practices documented
- ✅ UI components with examples
- ✅ Translation mapping included
- ✅ Common mistakes highlighted
- ✅ Ready for FE implementation

---

**Updated by:** System Documentation Update  
**Date:** 2025-10-01T09:10:00Z  
**Related:** notification-service-status-fix-20251001.md
