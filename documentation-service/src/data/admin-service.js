export const adminServiceData = {
  name: "Admin Service",
  description: "Comprehensive admin orchestrator service for ATMA. Provides centralized admin management by proxying requests to auth-service and archive-service. Features include admin authentication, user management, token operations, system monitoring, analytics, job management, performance optimization, and security auditing. All 4 development phases completed with 18 production-ready endpoints.",
  baseUrl: "api.futureguide.id",
  version: "2.0.0",
  port: "3007",
  endpoints: [
    {
      method: "POST",
      path: "/api/admin/login",
      title: "Admin Login",
      description: "Authenticate admin user and receive JWT token. Proxied to auth-service.",
  authentication: null,
  rateLimit: "Admin Limiter (1000/15min)",
      requestBody: {
        username: "admin",
        password: "AdminPassword123"
      },
      parameters: [
        {
          name: "username",
          type: "string",
          required: true,
          description: "Admin username or email"
        },
        {
          name: "password",
          type: "string",
          required: true,
          description: "Admin password"
        }
      ],
      response: {
        success: true,
        data: {
          user: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            email: "admin@example.com",
            username: "admin",
            user_type: "admin",
            is_active: true,
            created_at: "2024-01-15T10:30:00.000Z",
            profile: {
              full_name: "System Administrator"
            }
          },
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          message: "Login successful"
        }
      },
      errorResponses: [
        { code: "INVALID_CREDENTIALS", status: 400, message: "Invalid username/email or password" },
        { code: "ACCOUNT_INACTIVE", status: 401, message: "Account is not active" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/admin/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "admin",
    "password": "AdminPassword123"
  }'`
    },
    {
      method: "GET",
      path: "/api/admin/profile",
      title: "Get Admin Profile",
      description: "Get current admin user profile information. Proxied to auth-service.",
  authentication: "Bearer Token (Admin)",
  rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [],
      response: {
        success: true,
        data: {
          user: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            email: "admin@example.com",
            username: "admin",
            user_type: "admin",
            is_active: true,
            created_at: "2024-01-15T10:30:00.000Z",
            updated_at: "2024-01-20T14:22:00.000Z",
            profile: {
              full_name: "System Administrator"
            }
          }
        }
      },
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Admin access required" }
      ],
      example: `curl -X GET https://api.futureguide.id/api/admin/profile \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "PUT",
      path: "/api/admin/profile",
      title: "Update Admin Profile",
      description: "Update admin user profile information. Proxied to auth-service.",
  authentication: "Bearer Token (Admin)",
  rateLimit: "Admin Limiter (1000/15min)",
      requestBody: {
        full_name: "Updated Administrator Name"
      },
      parameters: [
        {
          name: "full_name",
          type: "string",
          required: false,
          description: "Full name of the admin user"
        }
      ],
      response: {
        success: true,
        data: {
          user: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            email: "admin@example.com",
            username: "admin",
            user_type: "admin",
            is_active: true,
            updated_at: "2024-01-20T14:22:00.000Z",
            profile: {
              full_name: "Updated Administrator Name"
            }
          }
        },
        message: "Profile updated successfully"
      },
      example: `curl -X PUT https://api.futureguide.id/api/admin/profile \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "full_name": "Updated Administrator Name"
  }'`
    },
    {
      method: "POST",
      path: "/api/admin/logout",
      title: "Admin Logout",
      description: "Logout admin user (client-side token invalidation). Proxied to auth-service.",
  authentication: "Bearer Token (Admin)",
  rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [],
      response: {
        success: true,
        message: "Logout successful"
    },
    example: `curl -X POST https://api.futureguide.id/api/admin/logout \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/admin/users",
      title: "Get All Users",
      description: "Get paginated list of all users with filtering options. Proxied to archive-service admin endpoints.",
  authentication: "Bearer Token (Admin)",
  rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "page",
          type: "integer",
          required: false,
          description: "Page number (default: 1)"
        },
        {
          name: "limit",
          type: "integer",
          required: false,
          description: "Items per page (default: 10, max: 100)"
        },
        {
          name: "search",
          type: "string",
          required: false,
          description: "Search by username or email"
        },
        {
          name: "user_type",
          type: "string",
          required: false,
          description: "Filter by user type (user, admin, superadmin)"
        },
        {
          name: "is_active",
          type: "boolean",
          required: false,
          description: "Filter by active status"
        }
      ],
      response: {
        success: true,
        data: {
          users: [
            {
              id: "550e8400-e29b-41d4-a716-446655440000",
              email: "user@example.com",
              username: "johndoe",
              user_type: "user",
              is_active: true,
              token_balance: 5,
              created_at: "2024-01-15T10:30:00.000Z",
              profile: {
                full_name: "John Doe"
              }
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        }
    },
    example: `curl -X GET "https://api.futureguide.id/api/admin/users?page=1&limit=10" \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/admin/users/:userId",
      title: "Get User Details",
      description: "Get detailed information about a specific user including analysis statistics. Proxied to archive-service admin endpoints.",
  authentication: "Bearer Token (Admin)",
  rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "userId",
          type: "string",
          required: true,
          description: "UUID of the user"
        }
      ],
      response: {
        success: true,
        data: {
          user: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            email: "user@example.com",
            username: "johndoe",
            user_type: "user",
            is_active: true,
            token_balance: 5,
            created_at: "2024-01-15T10:30:00.000Z",
            profile: {
              full_name: "John Doe"
            }
          },
          stats: {
            total_analyses: 3,
            completed_analyses: 2,
            processing_analyses: 1,
            failed_analyses: 0,
            latest_analysis: "2024-01-20T14:22:00.000Z"
          }
        }
      },
      errorResponses: [
        { code: "USER_NOT_FOUND", status: 404, message: "User not found" }
      ],
      example: `curl -X GET https://api.futureguide.id/api/admin/users/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "DELETE",
      path: "/api/admin/users/:userId",
      title: "Delete User",
      description: "Soft delete a user by modifying their email to include deleted timestamp. Proxied to archive-service admin endpoints.",
  authentication: "Bearer Token (Admin)",
  rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "userId",
          type: "string",
          required: true,
          description: "UUID of the user to delete"
        }
      ],
      response: {
        success: true,
        message: "User deleted successfully",
        data: {
          deletedUser: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            originalEmail: "user@example.com",
            deletedAt: "2024-01-20T14:22:00.000Z"
          }
        }
    },
    example: `curl -X DELETE https://api.futureguide.id/api/admin/users/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/admin/users/:userId/token-balance",
      title: "Update User Token Balance",
      description: "Update user token balance with add, subtract, or set operations. Proxied to auth-service token balance endpoint.",
      authentication: "Bearer Token (Admin)",
  rateLimit: "Admin Limiter (1000/15min)",
      requestBody: {
        operation: "add",
        amount: 10
      },
      parameters: [
        {
          name: "userId",
          type: "string",
          required: true,
          description: "UUID of the user"
        },
        {
          name: "operation",
          type: "string",
          required: true,
          description: "Operation type: 'add', 'subtract', or 'set'"
        },
        {
          name: "amount",
          type: "integer",
          required: true,
          description: "Token amount (minimum: 0)"
        }
      ],
      response: {
        success: true,
        data: {
          user: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            token_balance: 15,
            updated_at: "2024-01-20T14:22:00.000Z"
          },
          operation: "add",
          amount: 10,
          previous_balance: 5
        },
        message: "Token balance updated successfully"
      },
      errorResponses: [
        { code: "VALIDATION_ERROR", status: 400, message: "\"operation\" must be one of [add, subtract, set]" },
        { code: "USER_NOT_FOUND", status: 404, message: "User not found" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/admin/users/550e8400-e29b-41d4-a716-446655440000/token-balance \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "operation": "add",
    "amount": 10
  }'`
    },
    {
      method: "PUT",
      path: "/api/admin/users/:userId/token-balance/archive",
      title: "Update Token Balance (Archive Route)",
      description: "Alternative token balance update route via archive-service admin endpoints. Supports set, add, and subtract operations.",
  authentication: "Bearer Token (Admin)",
  rateLimit: "Admin Limiter (1000/15min)",
      requestBody: {
        token_balance: 20,
        action: "set"
      },
      parameters: [
        {
          name: "userId",
          type: "string",
          required: true,
          description: "UUID of the user"
        },
        {
          name: "token_balance",
          type: "integer",
          required: true,
          description: "Token balance amount (minimum: 0)"
        },
        {
          name: "action",
          type: "string",
          required: false,
          description: "Action type: 'set', 'add', or 'subtract' (default: 'set')"
        }
      ],
      response: {
        success: true,
        data: {
          user: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            token_balance: 20,
            updated_at: "2024-01-20T14:22:00.000Z"
          }
        },
        message: "Token balance updated successfully"
      },
      example: `curl -X PUT https://api.futureguide.id/api/admin/users/550e8400-e29b-41d4-a716-446655440000/token-balance/archive \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "token_balance": 20,
    "action": "set"
  }'`
    },
    {
      method: "PUT",
      path: "/api/admin/users/:userId/profile",
      title: "Update User Profile",
      description: "Update user profile information with comprehensive validation and activity logging. Phase 1 feature with 7ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: {
        full_name: "Updated User Name",
        bio: "Updated user biography"
      },
      parameters: [
        {
          name: "userId",
          type: "string",
          required: true,
          description: "UUID of the user"
        },
        {
          name: "full_name",
          type: "string",
          required: false,
          description: "Full name of the user"
        },
        {
          name: "bio",
          type: "string",
          required: false,
          description: "User biography"
        }
      ],
      response: {
        success: true,
        data: {
          user: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            profile: {
              full_name: "Updated User Name",
              bio: "Updated user biography"
            },
            updated_at: "2024-01-20T14:22:00.000Z"
          }
        },
        message: "User profile updated successfully"
      },
      example: `curl -X PUT https://api.futureguide.id/api/admin/users/550e8400-e29b-41d4-a716-446655440000/profile \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "full_name": "Updated User Name",
    "bio": "Updated user biography"
  }'`
    },
    {
      method: "GET",
      path: "/api/admin/stats/global",
      title: "Global System Statistics",
      description: "Get comprehensive system-wide statistics with health assessment. Phase 2 feature with 50-80ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [],
      response: {
        success: true,
        data: {
          total_users: 415,
          total_assessments: 497,
          total_jobs: 749,
          successful_jobs: 471,
          failed_jobs: 278,
          processing_jobs: 5,
          success_rate: 62.83,
          system_health: "healthy",
          health_details: {
            status: "healthy",
            factors: {
              success_rate: "good",
              processing_queue: "healthy",
              error_rate: "acceptable"
            }
          }
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/admin/stats/global \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/admin/jobs/monitor",
      title: "Job Monitoring",
      description: "Real-time job monitoring with progress tracking and queue statistics. Phase 2 feature with 60-90ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "status",
          type: "string",
          required: false,
          description: "Filter by job status (processing, queued, completed, failed)"
        },
        {
          name: "limit",
          type: "integer",
          required: false,
          description: "Limit number of results (default: 50)"
        }
      ],
      response: {
        success: true,
        data: {
          active_jobs: [
            {
              job_id: "job-550e8400",
              user_id: "550e8400-e29b-41d4-a716-446655440000",
              status: "processing",
              assessment_name: "Career Assessment",
              started_at: "2024-01-20T14:00:00.000Z",
              progress: 75,
              estimated_completion: "2024-01-20T14:25:00.000Z"
            }
          ],
          queue_stats: {
            queued: 12,
            processing: 3,
            avg_processing_time: "15 minutes"
          }
        }
      },
      example: `curl -X GET "https://api.futureguide.id/api/admin/jobs/monitor?status=processing" \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/admin/jobs/queue",
      title: "Queue Status",
      description: "Get queue status with automated health assessment. Phase 2 feature with 40-70ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [],
      response: {
        success: true,
        data: {
          queue_health: "healthy",
          queue_stats: {
            total_queued: 12,
            processing: 3,
            failed_last_hour: 2,
            success_rate_last_hour: 87.5
          },
          processing_capacity: {
            max_concurrent: 10,
            current_load: 30,
            available_slots: 7
          }
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/admin/jobs/queue \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/admin/jobs/all",
      title: "Get All Jobs (Including Deleted)",
      description: "Get all jobs including those with deleted status. Supports advanced filtering, pagination, and sorting. Phase 2 feature with comprehensive job management.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "limit",
          type: "integer",
          required: false,
          description: "Number of items per page (default: 20, max: 100)"
        },
        {
          name: "offset",
          type: "integer", 
          required: false,
          description: "Number of items to skip for pagination (default: 0)"
        },
        {
          name: "status",
          type: "string",
          required: false,
          description: "Filter by job status (queued, processing, completed, failed, deleted)"
        },
        {
          name: "user_id",
          type: "string",
          required: false,
          description: "Filter by user ID (UUID)"
        },
        {
          name: "assessment_name",
          type: "string",
          required: false,
          description: "Filter by assessment name"
        },
        {
          name: "include_deleted",
          type: "boolean",
          required: false,
          description: "Include deleted jobs (default: true)"
        },
        {
          name: "sort_by",
          type: "string",
          required: false,
          description: "Sort field: created_at, updated_at, status, assessment_name, priority (default: created_at)"
        },
        {
          name: "sort_order",
          type: "string",
          required: false,
          description: "Sort order: ASC or DESC (default: DESC)"
        }
      ],
      response: {
        success: true,
        data: {
          jobs: [
            {
              job_id: "job-550e8400",
              user_id: "550e8400-e29b-41d4-a716-446655440000",
              status: "completed",
              assessment_name: "Career Assessment",
              priority: 1,
              created_at: "2024-01-20T14:00:00.000Z",
              updated_at: "2024-01-20T14:15:00.000Z",
              processing_time: "15 minutes",
              test_result: {
                archetype: "The Analyst"
              }
            },
            {
              job_id: "job-550e8401",
              user_id: "550e8400-e29b-41d4-a716-446655440001",
              status: "deleted",
              assessment_name: "Personality Assessment",
              priority: 2,
              created_at: "2024-01-19T10:30:00.000Z",
              updated_at: "2024-01-19T10:45:00.000Z",
              processing_time: "12 minutes",
              test_result: {
                archetype: "The Creator"
              }
            }
          ],
          pagination: {
            limit: 20,
            offset: 0,
            total: 749,
            has_more: true
          }
        }
      },
      errorResponses: [
        { code: "VALIDATION_ERROR", status: 400, message: "Invalid parameters provided" },
        { code: "UNAUTHORIZED", status: 401, message: "Admin access required" }
      ],
      example: `curl -X GET "https://api.futureguide.id/api/admin/jobs/all?limit=20&status=completed&include_deleted=true" \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/admin/analytics/daily",
      title: "Daily Analytics",
      description: "Comprehensive daily analytics with trend analysis. Phase 3 feature with 60-80ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "date",
          type: "string",
          required: false,
          description: "Date in YYYY-MM-DD format (default: today)"
        }
      ],
      response: {
        success: true,
        data: {
          date: "2024-01-20",
          user_logins: 45,
          new_users: 8,
          assessments_completed: 23,
          assessments_started: 31,
          job_success_rate: 85.7,
          popular_assessments: [
            {
              name: "Career Assessment",
              count: 15
            },
            {
              name: "Personality Assessment",
              count: 8
            }
          ]
        }
      },
      example: `curl -X GET "https://api.futureguide.id/api/admin/analytics/daily?date=2024-01-20" \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/admin/assessments/:resultId/details",
      title: "Assessment Deep Dive",
      description: "Complete assessment details with test data, results, and processing information. Phase 3 feature with 45-65ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "resultId",
          type: "string",
          required: true,
          description: "UUID of the assessment result"
        }
      ],
      response: {
        success: true,
        data: {
          id: "result-550e8400",
          user_id: "550e8400-e29b-41d4-a716-446655440000",
          assessment_name: "Career Assessment",
          test_data: {
            riasec: {
              realistic: 75,
              investigative: 85,
              artistic: 45
            },
            ocean: {
              openness: 80,
              conscientiousness: 90
            }
          },
          test_result: {
            persona_profile: {
              archetype: "The Analyst",
              strengths: ["analytical", "detail-oriented"]
            }
          },
          processing_info: {
            started_at: "2024-01-20T14:00:00.000Z",
            completed_at: "2024-01-20T14:15:00.000Z",
            processing_time: "15 minutes",
            ai_model_used: "gpt-4"
          }
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/admin/assessments/result-550e8400/details \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/admin/assessments/search",
      title: "Search Assessments",
      description: "Advanced assessment search with filtering and pagination. Phase 3 feature with 70-90ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "q",
          type: "string",
          required: false,
          description: "Search query"
        },
        {
          name: "user_id",
          type: "string",
          required: false,
          description: "Filter by user ID"
        },
        {
          name: "assessment_name",
          type: "string",
          required: false,
          description: "Filter by assessment name"
        },
        {
          name: "page",
          type: "integer",
          required: false,
          description: "Page number (default: 1)"
        },
        {
          name: "limit",
          type: "integer",
          required: false,
          description: "Items per page (default: 20, max: 100)"
        }
      ],
      response: {
        success: true,
        data: {
          assessments: [
            {
              id: "result-550e8400",
              user_id: "550e8400-e29b-41d4-a716-446655440000",
              assessment_name: "Career Assessment",
              completed_at: "2024-01-20T14:15:00.000Z",
              status: "completed"
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 497,
            totalPages: 25
          }
        }
      },
      example: `curl -X GET "https://api.futureguide.id/api/admin/assessments/search?q=career&page=1" \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/admin/jobs/:jobId/cancel",
      title: "Cancel Job",
      description: "Cancel a running or queued job with validation. Phase 4 feature with 50-80ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: {
        reason: "Administrative cancellation"
      },
      parameters: [
        {
          name: "jobId",
          type: "string",
          required: true,
          description: "UUID of the job to cancel"
        },
        {
          name: "reason",
          type: "string",
          required: false,
          description: "Reason for cancellation"
        }
      ],
      response: {
        success: true,
        data: {
          job_id: "job-550e8400",
          previous_status: "processing",
          new_status: "cancelled",
          cancelled_at: "2024-01-20T14:22:00.000Z",
          reason: "Administrative cancellation"
        },
        message: "Job cancelled successfully"
      },
      example: `curl -X POST https://api.futureguide.id/api/admin/jobs/job-550e8400/cancel \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "reason": "Administrative cancellation"
  }'`
    },
    {
      method: "POST",
      path: "/api/admin/jobs/:jobId/retry",
      title: "Retry Failed Job",
      description: "Retry a failed job with retry count tracking. Phase 4 feature with 50-80ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "jobId",
          type: "string",
          required: true,
          description: "UUID of the job to retry"
        }
      ],
      response: {
        success: true,
        data: {
          job_id: "job-550e8400",
          previous_status: "failed",
          new_status: "queued",
          retry_count: 1,
          queued_at: "2024-01-20T14:22:00.000Z"
        },
        message: "Job queued for retry successfully"
      },
      example: `curl -X POST https://api.futureguide.id/api/admin/jobs/job-550e8400/retry \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/admin/jobs/bulk",
      title: "Bulk Job Operations",
      description: "Perform bulk operations on multiple jobs (up to 100). Phase 4 feature with 200-500ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: {
        job_ids: ["job-550e8400", "job-550e8401"],
        operation: "cancel",
        reason: "Bulk administrative action"
      },
      parameters: [
        {
          name: "job_ids",
          type: "array",
          required: true,
          description: "Array of job IDs (max: 100)"
        },
        {
          name: "operation",
          type: "string",
          required: true,
          description: "Operation: 'cancel', 'retry', or 'delete'"
        },
        {
          name: "reason",
          type: "string",
          required: false,
          description: "Reason for bulk operation"
        }
      ],
      response: {
        success: true,
        data: {
          operation: "cancel",
          total_jobs: 2,
          successful: 2,
          failed: 0,
          results: [
            {
              job_id: "job-550e8400",
              status: "success",
              message: "Job cancelled successfully"
            },
            {
              job_id: "job-550e8401",
              status: "success",
              message: "Job cancelled successfully"
            }
          ]
        },
        message: "Bulk operation completed: 2/2 successful"
      },
      example: `curl -X POST https://api.futureguide.id/api/admin/jobs/bulk \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_ids": ["job-550e8400", "job-550e8401"],
    "operation": "cancel",
    "reason": "Bulk administrative action"
  }'`
    },
    {
      method: "GET",
      path: "/api/admin/performance/report",
      title: "Performance Report",
      description: "Comprehensive performance analysis and monitoring. Phase 4 feature with 100-150ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "period",
          type: "string",
          required: false,
          description: "Time period: 'hour', 'day', 'week', 'month' (default: 'day')"
        }
      ],
      response: {
        success: true,
        data: {
          period: "day",
          performance_metrics: {
            avg_response_time: 125.5,
            total_requests: 1247,
            error_rate: 2.3,
            success_rate: 97.7
          },
          database_metrics: {
            avg_query_time: 45.2,
            slow_queries: 3,
            connection_pool_usage: 65
          },
          system_metrics: {
            cpu_usage: 23.5,
            memory_usage: 67.8,
            disk_usage: 45.2
          }
        }
      },
      example: `curl -X GET "https://api.futureguide.id/api/admin/performance/report?period=day" \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/admin/performance/optimize",
      title: "Database Optimization",
      description: "Run database optimization procedures. Phase 4 feature with automated tuning.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: {
        operations: ["vacuum", "reindex", "analyze"]
      },
      parameters: [
        {
          name: "operations",
          type: "array",
          required: false,
          description: "Optimization operations: 'vacuum', 'reindex', 'analyze' (default: all)"
        }
      ],
      response: {
        success: true,
        data: {
          operations_performed: ["vacuum", "reindex", "analyze"],
          optimization_results: {
            vacuum: "completed",
            reindex: "completed",
            analyze: "completed"
          },
          performance_improvement: {
            query_time_reduction: "15%",
            storage_reclaimed: "2.3GB"
          }
        },
        message: "Database optimization completed successfully"
      },
      example: `curl -X POST https://api.futureguide.id/api/admin/performance/optimize \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "operations": ["vacuum", "reindex", "analyze"]
  }'`
    },
    {
      method: "GET",
      path: "/api/admin/security/audit",
      title: "Security Audit Report",
      description: "30-day security analysis with risk assessment. Phase 4 feature with 80-120ms response time.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: null,
      parameters: [
        {
          name: "days",
          type: "integer",
          required: false,
          description: "Number of days to analyze (default: 30, max: 90)"
        }
      ],
      response: {
        success: true,
        data: {
          audit_period: "30 days",
          security_events: {
            total_events: 145,
            high_risk: 2,
            medium_risk: 8,
            low_risk: 135
          },
          authentication_stats: {
            successful_logins: 1247,
            failed_logins: 23,
            suspicious_attempts: 3
          },
          data_access: {
            admin_actions: 89,
            user_data_accessed: 245,
            bulk_operations: 12
          },
          recommendations: [
            "Review failed login patterns",
            "Monitor bulk operations frequency"
          ]
        }
      },
      example: `curl -X GET "https://api.futureguide.id/api/admin/security/audit?days=30" \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/admin/security/anonymize/:userId",
      title: "GDPR Data Anonymization",
      description: "Anonymize user data for GDPR compliance. Phase 4 feature with complete data anonymization.",
      authentication: "Bearer Token (Admin)",
      rateLimit: "Admin Limiter (1000/15min)",
      requestBody: {
        reason: "GDPR data anonymization request"
      },
      parameters: [
        {
          name: "userId",
          type: "string",
          required: true,
          description: "UUID of the user to anonymize"
        },
        {
          name: "reason",
          type: "string",
          required: true,
          description: "Reason for anonymization"
        }
      ],
      response: {
        success: true,
        data: {
          user_id: "550e8400-e29b-41d4-a716-446655440000",
          anonymization_status: "completed",
          anonymized_fields: [
            "email",
            "username",
            "full_name",
            "profile_data"
          ],
          anonymized_at: "2024-01-20T14:22:00.000Z",
          reason: "GDPR data anonymization request"
        },
        message: "User data anonymized successfully"
      },
      example: `curl -X POST https://api.futureguide.id/api/admin/security/anonymize/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "reason": "GDPR data anonymization request"
  }'`
    }
  ]
};
