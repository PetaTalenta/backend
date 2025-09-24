export const assessmentServiceData = {
  name: "Assessment Service",
  description: "AI-driven talent mapping assessment service. Submit and monitor personality assessments using RIASEC, OCEAN, and VIA-IS frameworks for comprehensive career guidance.",
  baseUrl: "api.futureguide.id",
  version: "1.0.0",
  port: "3003",
  endpoints: [
    {
      method: "POST",
      path: "/api/assessment/submit",
      title: "Submit Assessment",
      description: "Submit assessment data for AI analysis. Assessment consists of RIASEC (6 dimensions), OCEAN (5 dimensions), VIA-IS (24 character strengths), and optionally rawResponses (item-level answers). rawResponses will be stored as raw_responses (JSONB) in archive.analysis_results.",
      authentication: "Bearer Token Required",
      rateLimit: "1000 requests per 1 hour",
      requestBody: {
        assessmentName: "AI-Driven Talent Mapping",
        riasec: {
          realistic: 75,
          investigative: 80,
          artistic: 65,
          social: 70,
          enterprising: 85,
          conventional: 60
        },
        ocean: {
          openness: 80,
          conscientiousness: 75,
          extraversion: 70,
          agreeableness: 85,
          neuroticism: 40
        },
        viaIs: {
          creativity: 80,
          curiosity: 85,
          judgment: 75,
          loveOfLearning: 90,
          perspective: 70,
          bravery: 65,
          perseverance: 80,
          honesty: 85,
          zest: 75,
          love: 80,
          kindness: 85,
          socialIntelligence: 75,
          teamwork: 80,
          fairness: 85,
          leadership: 70,
          forgiveness: 75,
          humility: 80,
          prudence: 75,
          selfRegulation: 80,
          appreciationOfBeauty: 70,
          gratitude: 85,
          hope: 80,
          humor: 75,
          spirituality: 60
        },
        industryScore: {
          teknologi: 24,
          kesehatan: 24,
          keuangan: 24,
          pendidikan: 24,
          rekayasa: 24,
          pemasaran: 24,
          hukum: 24,
          kreatif: 24,
          media: 24,
          penjualan: 24,
          sains: 24,
          manufaktur: 24,
          agrikultur: 24,
          pemerintahan: 24,
          konsultasi: 24,
          pariwisata: 24,
          logistik: 24,
          energi: 24,
          sosial: 24,
          olahraga: 24,
          properti: 24,
          kuliner: 24,
          perdagangan: 24,
          telekomunikasi: 24
        },
        rawResponses: {
          riasec: [{ questionId: "Riasec-R-01", value: 4 }],
          ocean: [{ questionId: "Ocean-O-01", value: 5 }],
          viaIs: [{ questionId: "VIA-Judgement-01", value: 4 }]
        },
        rawSchemaVersion: "v1"
      },
      parameters: [
        {
          name: "assessmentName",
          type: "string",
          required: false,
          description: "Must be one of: 'AI-Driven Talent Mapping', 'AI-Based IQ Test', or 'Custom Assessment'"
        },
        {
          name: "riasec",
          type: "object",
          required: true,
          description: "RIASEC assessment with 6 dimensions, all scores must be integers between 0-100"
        },
        {
          name: "ocean",
          type: "object",
          required: true,
          description: "Big Five personality traits with 5 dimensions, all scores must be integers between 0-100"
        },
        {
          name: "viaIs",
          type: "object",
          required: true,
          description: "VIA-IS character strengths - all 24 strengths must be provided, scores between 0-100"
        },
        {
          name: "industryScore",
          type: "object",
          required: false,
          description: "Industry interest scores - optional field with 24 industry categories, scores between 0-100"
        },
        {
          name: "rawResponses",
          type: "object",
          required: false,
          description: "Optional item-level responses. Shape: { riasec: [{questionId, value, ...}], ocean: [...], viaIs: [...] }. Will be stored as raw_responses (JSONB) in archive.analysis_results"
        },
        {
          name: "rawSchemaVersion",
          type: "string",
          required: false,
          description: "Schema version for rawResponses (default: 'v1')"
        }
      ],
      response: {
        success: true,
        message: "Assessment submitted successfully and queued for analysis",
        data: {
          jobId: "550e8400-e29b-41d4-a716-446655440000",
          status: "queued",
          estimatedProcessingTime: "2-5 minutes",
          queuePosition: 3,
          tokenCost: 1,
          remainingTokens: 9
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/assessment/submit \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "X-Idempotency-Key: YOUR_UNIQUE_KEY" \\
  -d '{
    "assessmentName": "AI-Driven Talent Mapping",
    "riasec": {
      "realistic": 75,
      "investigative": 80,
      "artistic": 65,
      "social": 70,
      "enterprising": 85,
      "conventional": 60
    },
    "ocean": {
      "openness": 80,
      "conscientiousness": 75,
      "extraversion": 70,
      "agreeableness": 85,
      "neuroticism": 40
    },
    "viaIs": {
      "creativity": 80,
      "curiosity": 85,
      "judgment": 75
    },
    "rawResponses": {
      "riasec": [{ "questionId": "Riasec-R-01", "value": 4 }],
      "ocean": [{ "questionId": "Ocean-O-01", "value": 5 }],
      "viaIs": [{ "questionId": "VIA-Judgement-01", "value": 4 }]
    },
    "rawSchemaVersion": "v1",
    "industryScore": {
      "teknologi": 24,
      "kesehatan": 24,
      "keuangan": 24
    }
  }'`
    },
    {
      method: "POST",
      path: "/api/assessment/retry",
      title: "Retry Assessment",
      description: "Re-run AI analysis using existing assessment_data from a previous result. Creates a new jobId and consumes tokens like a fresh submission.",
      authentication: "Bearer Token Required",
      rateLimit: "Follow general gateway limit",
      requestBody: {
        resultId: "550e8400-e29b-41d4-a716-446655440010"
      },
      parameters: [
        {
          name: "resultId",
          type: "string",
          required: true,
          description: "UUID of previous analysis result owned by the user"
        }
      ],
      notes: [
        "Result must belong to authenticated user",
        "Result must contain non-empty assessment_data",
        "New job stored in Archive Service; original result remains unchanged",
        "Token deducted (ANALYSIS_TOKEN_COST). Refunded automatically if archive job creation fails"
      ],
      response: {
        success: true,
        message: "Assessment retry queued successfully",
        data: {
          jobId: "550e8400-e29b-41d4-a716-446655440099",
          originalResultId: "550e8400-e29b-41d4-a716-446655440010",
          status: "queued",
          estimatedProcessingTime: "2-5 minutes",
          queuePosition: 2,
          tokenCost: 1,
          remainingTokens: 8
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/assessment/retry \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "resultId": "550e8400-e29b-41d4-a716-446655440010"
  }'`
    },
    {
      method: "GET",
      path: "/api/assessment/status/:jobId",
      title: "Get Job Status",
      description: "Get the processing status of an assessment job by job ID.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 10 minutes",
      parameters: [
        {
          name: "jobId",
          type: "string",
          required: true,
          description: "UUID of the assessment job"
        }
      ],
      response: {
        success: true,
        message: "Job status retrieved successfully",
        data: {
          jobId: "550e8400-e29b-41d4-a716-446655440000",
          status: "processing",
          progress: 75,
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:05:00Z",
          estimatedTimeRemaining: "2 minutes",
          queuePosition: 1,
          userId: "550e8400-e29b-41d4-a716-446655440001",
          userEmail: "user@example.com",
          resultId: "550e8400-e29b-41d4-a716-446655440002",
          assessmentName: "AI-Driven Talent Mapping",
          error: null
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/assessment/status/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/assessment/queue/status",
      title: "Get Queue Status",
      description: "Get information about the assessment processing queue for monitoring purposes.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 10 minutes",
      response: {
        success: true,
        message: "Queue status retrieved successfully",
        data: {
          queueLength: 15,
          activeWorkers: 3,
          averageProcessingTime: "3.2 minutes",
          estimatedWaitTime: "5-10 minutes",
          jobStats: {
            total: 1000,
            queued: 15,
            processing: 3,
            completed: 950,
            failed: 32
          }
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/assessment/queue/status \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/assessment/health",
      title: "Service Health Check",
      description: "Check the health status of the assessment service and its dependencies.",
      authentication: null,
      rateLimit: "5000 requests per 10 minutes",
      response: {
        status: "healthy",
        timestamp: "2024-01-01T00:00:00.000Z",
        service: "assessment-service",
        version: "1.0.0",
        dependencies: {
          rabbitmq: {
            status: "healthy",
            details: {
              messageCount: 5,
              consumerCount: 2
            }
          },
          authService: {
            status: "healthy"
          },
          archiveService: {
            status: "healthy"
          }
        },
        jobs: {
          total: 1000,
          queued: 5,
          processing: 2,
          completed: 950,
          failed: 43
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/assessment/health`
    },
    {
      method: "GET",
      path: "/api/assessment/health/live",
      title: "Liveness Probe",
      description: "Simple liveness probe to verify the assessment service is running.",
      authentication: null,
      rateLimit: "No limit",
      response: {
        status: "alive",
        timestamp: "2024-01-01T00:00:00.000Z"
      },
      example: `curl -X GET https://api.futureguide.id/api/assessment/health/live`
    },
    {
      method: "GET",
      path: "/api/assessment/health/ready",
      title: "Readiness Probe",
      description: "Readiness probe to check if dependencies are available and the service is ready to receive traffic.",
      authentication: null,
      rateLimit: "No limit",
      response: {
        status: "ready",
        timestamp: "2024-01-01T00:00:00.000Z"
      },
      example: `curl -X GET https://api.futureguide.id/api/assessment/health/ready`
    },
    {
      method: "GET",
      path: "/api/assessment/health/queue",
      title: "Queue Health",
      description: "Queue health check exposing RabbitMQ queue statistics used by the assessment pipeline.",
      authentication: null,
      rateLimit: "No limit",
      response: {
        status: "healthy",
        timestamp: "2024-01-01T00:00:00.000Z",
        details: {
          isHealthy: true,
          messageCount: 5,
          consumerCount: 2
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/assessment/health/queue`
    },
    {
      method: "GET",
      path: "/api/assessment/idempotency/health",
      title: "Idempotency Health Check",
      description: "Check the health status of the idempotency service to prevent duplicate submissions.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 10 minutes",
      response: {
        success: true,
        message: "Idempotency service health check completed",
        data: {
          status: "healthy",
          cacheSize: 150,
          expiredEntries: 5,
          lastCleanup: "2024-01-01T09:00:00Z"
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/assessment/idempotency/health \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/assessment/idempotency/cleanup",
      title: "Cleanup Idempotency Cache",
      description: "Clean up expired idempotency cache entries for maintenance purposes.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 10 minutes",
      response: {
        success: true,
        message: "Idempotency cache cleaned up successfully",
        data: {
          removedEntries: 25,
          remainingEntries: 125
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/assessment/idempotency/cleanup \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    }
  ]
};
