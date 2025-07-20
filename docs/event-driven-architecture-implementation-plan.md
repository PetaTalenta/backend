# Rencana Implementasi Event-Driven Architecture untuk Mengurangi Coupling Antar Service

## Analisis Masalah Saat Ini

### Tight Coupling yang Teridentifikasi

1. **AnalysisWorker → NotificationService**
   - Direct HTTP call ke `POST /notifications/analysis-complete`
   - Direct HTTP call ke `POST /notifications/analysis-failed`
   - AnalysisWorker harus tahu endpoint dan protokol NotificationService

2. **AnalysisWorker → AssessmentService**
   - Direct HTTP call ke `POST /assessments/callback/completed`
   - Direct HTTP call ke `POST /assessments/callback/failed`
   - AnalysisWorker harus tahu endpoint dan protokol AssessmentService

### Dampak Tight Coupling

- **Dependency**: AnalysisWorker bergantung langsung pada availability NotificationService dan AssessmentService
- **Maintenance**: Perubahan endpoint atau protokol di service lain memerlukan update AnalysisWorker
- **Scalability**: Sulit menambah service baru yang perlu notifikasi tanpa mengubah AnalysisWorker
- **Reliability**: Jika NotificationService down, AnalysisWorker akan error (meski tidak critical)

## Solusi: Event-Driven Architecture dengan RabbitMQ

### Konsep Implementasi

1. **AnalysisWorker** akan publish events ke RabbitMQ exchange
2. **NotificationService** dan **AssessmentService** akan subscribe ke events tersebut
3. **Decoupling**: AnalysisWorker tidak perlu tahu siapa yang consume events

### Event Types yang Akan Dibuat

1. **`analysis.completed`** - Ketika analisis berhasil
2. **`analysis.failed`** - Ketika analisis gagal
3. **`analysis.started`** - Ketika analisis dimulai (optional untuk future use)

## Rencana Implementasi Detail

### Phase 1: Setup Event Infrastructure

#### 1.1 Buat Event Publisher Service di AnalysisWorker

**File Baru**: `analysis-worker/src/services/eventPublisher.js`

**Tujuan**: Centralized service untuk publish events ke RabbitMQ

**Fungsi**:
- `publishAnalysisCompleted(eventData)`
- `publishAnalysisFailed(eventData)`
- `publishAnalysisStarted(eventData)` (optional)

**Event Data Structure**:
```json
{
  "eventType": "analysis.completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "jobId": "uuid",
  "userId": "uuid",
  "userEmail": "user@example.com",
  "resultId": "uuid", // untuk completed events
  "errorMessage": "error details", // untuk failed events
  "metadata": {
    "assessmentName": "AI-Driven Talent Mapping",
    "processingTime": 5000,
    "retryCount": 0
  }
}
```

#### 1.2 Update RabbitMQ Configuration

**File yang Diubah**: `analysis-worker/src/config/rabbitmq.js`

**Perubahan**:
- Tambah exchange untuk events: `atma_events_exchange`
- Tambah routing keys untuk events:
  - `analysis.completed`
  - `analysis.failed`
  - `analysis.started`

### Phase 2: Update AnalysisWorker

#### 2.1 Update Assessment Processors

**File yang Diubah**:
- `analysis-worker/src/processors/assessmentProcessor.js`
- `analysis-worker/src/processors/optimizedAssessmentProcessor.js`

**Perubahan**:
1. **Import eventPublisher** instead of notificationService
2. **Replace direct HTTP calls** dengan event publishing:
   - `notificationService.sendAnalysisCompleteNotification()` → `eventPublisher.publishAnalysisCompleted()`
   - `notificationService.sendAnalysisFailureNotification()` → `eventPublisher.publishAnalysisFailed()`
   - `notificationService.updateAssessmentJobStatus()` → `eventPublisher.publishAnalysisCompleted()`
   - `notificationService.updateAssessmentJobStatusFailed()` → `eventPublisher.publishAnalysisFailed()`

**Efek**:
- AnalysisWorker tidak lagi bergantung pada NotificationService dan AssessmentService
- Error handling menjadi lebih sederhana (fire-and-forget events)
- Lebih resilient terhadap service downtime

#### 2.2 Deprecate notificationService.js

**File yang Diubah**: `analysis-worker/src/services/notificationService.js`

**Perubahan**:
- Tambah deprecation warnings
- Keep functions untuk backward compatibility (temporary)
- Plan untuk removal di future version

### Phase 3: Setup Event Consumers

#### 3.1 Buat Event Consumer di NotificationService

**File Baru**: `notification-service/src/services/eventConsumer.js`

**Tujuan**: Subscribe dan handle analysis events

**Fungsi**:
- `handleAnalysisCompleted(eventData)` - Process completed analysis events
- `handleAnalysisFailed(eventData)` - Process failed analysis events

**File Baru**: `notification-service/src/config/rabbitmq.js`

**Tujuan**: RabbitMQ configuration untuk NotificationService

#### 3.2 Buat Event Consumer di AssessmentService

**File Baru**: `assessment-service/src/services/eventConsumer.js`

**Tujuan**: Subscribe dan handle analysis events untuk job status updates

**Fungsi**:
- `handleAnalysisCompleted(eventData)` - Update job status to completed
- `handleAnalysisFailed(eventData)` - Update job status to failed and refund tokens

**File Baru**: `assessment-service/src/config/rabbitmq.js`

**Tujuan**: RabbitMQ configuration untuk AssessmentService

### Phase 4: Integration dan Testing

#### 4.1 Update Package Dependencies

**File yang Diubah**:
- `notification-service/package.json` - Tambah `amqplib`
- `assessment-service/package.json` - Tambah `amqplib`

#### 4.2 Update Environment Configuration

**File yang Diubah**:
- `notification-service/.env.example`
- `assessment-service/.env.example`

**Tambahan**:
```env
# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
EVENTS_EXCHANGE_NAME=atma_events_exchange
EVENTS_QUEUE_NAME_NOTIFICATIONS=analysis_events_notifications
EVENTS_QUEUE_NAME_ASSESSMENTS=analysis_events_assessments
```

#### 4.3 Update Service Startup

**File yang Diubah**:
- `notification-service/src/server.js` - Initialize event consumer
- `assessment-service/src/server.js` - Initialize event consumer

## Migration Strategy

### Phase 1: Parallel Implementation (Recommended)

1. **Implement event system** alongside existing HTTP calls
2. **Both systems run in parallel** untuk testing
3. **Gradual migration** dengan feature flags
4. **Remove HTTP calls** setelah event system stable

### Phase 2: Feature Flag Implementation

**Environment Variable**: `USE_EVENT_DRIVEN=true/false`

- `true`: Use event-driven architecture
- `false`: Use existing HTTP calls (fallback)

## Keuntungan Implementasi

### 1. Loose Coupling
- AnalysisWorker tidak perlu tahu service consumers
- Easy to add new services yang perlu analysis events
- Service independence

### 2. Reliability
- Asynchronous processing
- Message persistence di RabbitMQ
- Retry mechanism built-in
- Service downtime tidak affect AnalysisWorker

### 3. Scalability
- Multiple consumers per event type
- Load balancing automatic
- Easy horizontal scaling

### 4. Maintainability
- Clear separation of concerns
- Easier testing (mock events)
- Better monitoring dan logging

## Hal yang Harus Diperhatikan

### 1. Message Ordering
- Events mungkin tidak arrive dalam order yang sama
- Implement idempotency di consumers
- Use message timestamps untuk ordering

### 2. Error Handling
- Dead letter queues untuk failed messages
- Retry policies
- Circuit breaker patterns

### 3. Monitoring
- Event publishing metrics
- Consumer lag monitoring
- Message processing time

### 4. Data Consistency
- Eventual consistency model
- Compensating transactions untuk failures
- Event sourcing considerations

### 5. Testing Strategy
- Unit tests untuk event publishers/consumers
- Integration tests dengan RabbitMQ
- End-to-end testing scenarios

## Timeline Estimasi

- **Phase 1** (Setup Infrastructure): 2-3 hari
- **Phase 2** (Update AnalysisWorker): 1-2 hari
- **Phase 3** (Setup Consumers): 2-3 hari
- **Phase 4** (Integration & Testing): 2-3 hari
- **Total**: 7-11 hari kerja

## Next Steps

1. Review dan approval rencana implementasi
2. Setup development environment dengan RabbitMQ
3. Implement Phase 1 (Event Infrastructure)
4. Testing dan validation setiap phase
5. Production deployment dengan feature flags
