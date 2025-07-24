export const apiData = {
  overview: {
    title: "ATMA API Gateway",
    description:
      "ATMA API Gateway adalah entry point tunggal untuk semua komunikasi dengan backend services. Gateway ini mengelola routing, authentication, rate limiting, dan security untuk seluruh sistem ATMA (AI-Driven Talent Mapping Assessment).",
    baseUrl: "api.chhrone.web.id",
    version: "1.0.0",
    architecture: {
      title: "Architecture Overview",
      description:
        "Client Application → API Gateway (Port 3000) → Services (Auth: 3001, Archive: 3002, Assessment: 3003, Notification: 3005)",
    },
  },

  authentication: {
    title: "Authentication & User Management",
    description:
      "Sistem autentikasi menggunakan JWT token untuk sebagian besar endpoint. Rate limiting: Auth endpoints (100 req/15min), General (5000 req/15min).",
    endpoints: [
      {
        title: "Register User",
        method: "POST",
        url: "/api/auth/register",
        description: "Mendaftarkan user baru ke sistem",
        authentication: "None (Public)",
        rateLimit: "Auth Limiter (100/15min)",
        headers: ["Content-Type: application/json"],
        body: {
          email: "user@example.com",
          password: "myPassword1",
        },
        validation: [
          "email: Valid email format, maximum 255 characters, required",
          "password: Minimum 8 characters, must contain at least one letter and one number, required",
        ],
        response: {
          success: true,
          data: {
            user: {
              id: "550e8400-e29b-41d4-a716-446655440000",
              email: "user@example.com",
              username: null,
              user_type: "user",
              is_active: true,
              token_balance: 5,
              created_at: "2024-01-15T10:30:00.000Z"
            },
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          },
          message: "User registered successfully"
        },
      },
      {
        title: "Register Batch Users",
        method: "POST",
        url: "/api/auth/register/batch",
        description: "Registrasi batch user (untuk admin/testing)",
        authentication: "None (Public)",
        rateLimit: "Auth Limiter (100/15min)",
        headers: ["Content-Type: application/json"],
        body: {
          users: [
            {
              email: "user1@example.com",
              password: "myPassword1"
            },
            {
              email: "user2@example.com",
              password: "anotherPass2"
            }
          ]
        },
        validation: [
          "users: Array of user objects, maximum 50 users per batch, required",
          "Each user object follows same validation as single registration",
          "Duplicate emails within batch are not allowed",
        ],
        response: {
          success: true,
          message: "Batch user registration processed successfully",
          data: {
            total: 2,
            successful: 2,
            failed: 0,
            results: [
              {
                index: 0,
                success: true,
                user: {
                  id: "550e8400-e29b-41d4-a716-446655440000",
                  email: "user1@example.com",
                  token_balance: 5,
                  created_at: "2024-01-15T10:30:00.000Z"
                },
                token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                error: null
              }
            ]
          }
        },
      },
      {
        title: "User Login",
        method: "POST",
        url: "/api/auth/login",
        description: "Login user dan mendapatkan JWT token",
        authentication: "None (Public)",
        rateLimit: "Auth Limiter (100/15min)",
        headers: ["Content-Type: application/json"],
        body: {
          email: "user@example.com",
          password: "myPassword1",
        },
        validation: [
          "email: Valid email format, required",
          "password: Required (no specific format validation for login)",
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
              token_balance: 5
            },
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
          message: "Login successful"
        },
      },
      {
        title: "Get User Profile",
        method: "GET",
        url: "/api/auth/profile",
        description: "Mendapatkan profil user yang sedang login",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: ["Authorization: Bearer <token>"],
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
              updated_at: "2024-01-15T10:30:00.000Z"
            },
            profile: {
              full_name: "John Doe",
              date_of_birth: "1990-01-15",
              gender: "male",
              school_id: 1
            }
          }
        },
      },
      {
        title: "Update User Profile",
        method: "PUT",
        url: "/api/auth/profile",
        description: "Update profil user",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: [
          "Authorization: Bearer <token>",
          "Content-Type: application/json",
        ],
        body: {
          username: "johndoe",
          full_name: "John Doe",
          school_id: 1,
          date_of_birth: "1990-01-15",
          gender: "male",
        },
        validation: [
          "username: Alphanumeric only, 3-100 characters, optional",
          "email: Valid email format, maximum 255 characters, optional",
          "full_name: Maximum 100 characters, optional",
          "school_id: Positive integer, optional",
          "date_of_birth: ISO date format (YYYY-MM-DD), cannot be future date, optional",
          'gender: Must be one of: "male", "female", optional',
        ],
      },
      {
        title: "Delete User Profile",
        method: "DELETE",
        url: "/api/auth/profile",
        description: "Hapus profil user yang sedang login (soft delete)",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: ["Authorization: Bearer <token>"],
        response: {
          success: true,
          message: "Profile deleted successfully"
        },
        warning: "Endpoint ini hanya menghapus profil user (user_profiles table), bukan akun user itu sendiri. Untuk menghapus akun user secara keseluruhan, gunakan endpoint DELETE /api/auth/account.",
      },
      {
        title: "Delete User Account",
        method: "DELETE",
        url: "/api/auth/account",
        description: "Hapus akun user yang sedang login secara keseluruhan (soft delete)",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: ["Authorization: Bearer <token>"],
        response: {
          success: true,
          message: "Account deleted successfully",
          data: {
            deletedAt: "2024-01-15T10:30:00.000Z",
            originalEmail: "user@example.com"
          }
        },
        warning: "Operasi ini melakukan soft delete dengan mengubah email user menjadi format deleted_{timestamp}_{original_email}. Token balance akan direset ke 0, status is_active menjadi false, dan profil user akan dihapus otomatis. Operasi ini tidak dapat di-undo.",
      },
      {
        title: "Change Password",
        method: "POST",
        url: "/api/auth/change-password",
        description: "Mengubah password user",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: [
          "Authorization: Bearer <token>",
          "Content-Type: application/json",
        ],
        body: {
          currentPassword: "oldPassword1",
          newPassword: "newPassword2",
        },
        validation: [
          "currentPassword: Required",
          "newPassword: Minimum 8 characters, must contain at least one letter and one number, required",
        ],
      },
      {
        title: "Logout",
        method: "POST",
        url: "/api/auth/logout",
        description: "Logout user dari sistem",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: ["Authorization: Bearer <token>"],
      },
      {
        title: "Get Token Balance",
        method: "GET",
        url: "/api/auth/token-balance",
        description: "Mendapatkan saldo token user",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: ["Authorization: Bearer <token>"],
        response: {
          success: true,
          data: {
            userId: "550e8400-e29b-41d4-a716-446655440000",
            tokenBalance: 5,
            lastUpdated: "2024-01-15T10:30:00.000Z"
          }
        },
      },
    ],
  },

  schools: {
    title: "School Management",
    description: "Endpoint untuk mengelola data sekolah. Semua endpoint memerlukan autentikasi Bearer Token.",
    endpoints: [
      {
        title: "Get Schools",
        method: "GET",
        url: "/api/auth/schools",
        description: "Mendapatkan daftar semua sekolah",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: ["Authorization: Bearer <token>"],
      },
      {
        title: "Create School",
        method: "POST",
        url: "/api/auth/schools",
        description: "Membuat sekolah baru",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: [
          "Authorization: Bearer <token>",
          "Content-Type: application/json",
        ],
        body: {
          name: "SMA Negeri 1 Jakarta",
          address: "Jl. Sudirman No. 1",
          city: "Jakarta",
          province: "DKI Jakarta",
        },
        validation: [
          "name: Maximum 200 characters, required",
          "address: Optional",
          "city: Maximum 100 characters, optional",
          "province: Maximum 100 characters, optional",
        ],
      },
      {
        title: "Get Schools by Location",
        method: "GET",
        url: "/api/auth/schools/by-location?city=Jakarta&province=DKI Jakarta",
        description: "Mendapatkan sekolah berdasarkan lokasi",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: ["Authorization: Bearer <token>"],
        queryParams: [
          "city: Nama kota untuk filter (optional)",
          "province: Nama provinsi untuk filter (optional)"
        ],
      },
      {
        title: "Get School Location Statistics",
        method: "GET",
        url: "/api/auth/schools/location-stats",
        description: "Mendapatkan statistik lokasi sekolah",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: ["Authorization: Bearer <token>"],
      },
      {
        title: "Get School Distribution",
        method: "GET",
        url: "/api/auth/schools/distribution",
        description: "Mendapatkan distribusi sekolah",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: ["Authorization: Bearer <token>"],
      },
      {
        title: "Get Users by School",
        method: "GET",
        url: "/api/auth/schools/:schoolId/users",
        description: "Mendapatkan user berdasarkan sekolah",
        authentication: "Bearer Token Required",
        rateLimit: "General Gateway (5000/15min)",
        headers: ["Authorization: Bearer <token>"],
        pathParams: ["schoolId: ID sekolah (integer)"],
      },
    ],
  },

  admin: {
    title: "Admin Management",
    description: "Endpoint khusus untuk admin dan superadmin. Rate limiting: Admin endpoints (50 req/15min), Auth endpoints (100 req/15min).",
    endpoints: [
      {
        title: "Admin Login",
        method: "POST",
        url: "/api/admin/login",
        description: "Login untuk admin",
        authentication: "None (Public)",
        rateLimit: "Auth Limiter (100/15min)",
        headers: ["Content-Type: application/json"],
        body: {
          username: "admin",
          password: "Admin123!",
        },
        validation: [
          "username: Required (can be username or email)",
          "password: Required (no specific format validation for login)",
        ],
        response: {
          success: true,
          data: {
            admin: {
              id: "550e8400-e29b-41d4-a716-446655440000",
              username: "admin",
              email: "admin@atma.com",
              user_type: "admin",
              is_active: true,
              created_at: "2024-01-15T10:30:00.000Z"
            },
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          },
          message: "Admin login successful"
        },
      },
      {
        title: "Get Admin Profile",
        method: "GET",
        url: "/api/admin/profile",
        description: "Mendapatkan profil admin yang sedang login",
        authentication: "Bearer Token + Admin Role Required",
        rateLimit: "Admin Limiter (50/15min)",
        headers: ["Authorization: Bearer <admin_token>"],
      },
      {
        title: "Update Admin Profile",
        method: "PUT",
        url: "/api/admin/profile",
        description: "Update profil admin",
        authentication: "Bearer Token + Admin Role Required",
        rateLimit: "Admin Limiter (50/15min)",
        headers: [
          "Authorization: Bearer <admin_token>",
          "Content-Type: application/json",
        ],
        body: {
          username: "newusername",
          email: "newemail@atma.com",
          full_name: "Updated Admin Name",
        },
        validation: [
          "username: Alphanumeric only, 3-100 characters, optional",
          "email: Valid email format, maximum 255 characters, optional",
          "full_name: Maximum 100 characters, optional",
        ],
      },
      {
        title: "Change Admin Password",
        method: "POST",
        url: "/api/admin/change-password",
        description: "Ubah password admin",
        authentication: "Bearer Token + Admin Role Required",
        rateLimit: "Admin Limiter (50/15min)",
        headers: [
          "Authorization: Bearer <admin_token>",
          "Content-Type: application/json",
        ],
        body: {
          currentPassword: "OldAdmin123!",
          newPassword: "NewAdmin456!",
        },
        validation: [
          "currentPassword: Required",
          "newPassword: Minimum 8 characters, must contain at least one letter and one number, required",
        ],
        warning: "Admin password change currently uses weaker validation than admin registration. Consider using stronger validation for consistency.",
      },
      {
        title: "Admin Logout",
        method: "POST",
        url: "/api/admin/logout",
        description: "Logout admin dari sistem",
        authentication: "Bearer Token + Admin Role Required",
        rateLimit: "Admin Limiter (50/15min)",
        headers: ["Authorization: Bearer <admin_token>"],
      },
      {
        title: "Register New Admin",
        method: "POST",
        url: "/api/admin/register",
        description: "Mendaftarkan admin baru (Superadmin only)",
        authentication: "Bearer Token + Superadmin Role Required",
        rateLimit: "Admin Limiter (50/15min)",
        headers: [
          "Authorization: Bearer <superadmin_token>",
          "Content-Type: application/json",
        ],
        body: {
          username: "newadmin",
          email: "newadmin@atma.com",
          password: "NewAdmin123!",
          full_name: "New Admin",
          user_type: "admin",
        },
        validation: [
          "username: Alphanumeric only, 3-100 characters, required",
          "email: Valid email format, maximum 255 characters, required",
          "password: Minimum 8 characters, maximum 128 characters, must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&), required",
          "full_name: Maximum 255 characters, optional",
          'user_type: Must be one of: "admin", "superadmin", "moderator", defaults to "admin"',
        ],
      },
    ],
  },

  adminUserManagement: {
    title: "Admin User Management",
    description: "Endpoint untuk admin mengelola user. Semua endpoint memerlukan role admin atau superadmin.",
    endpoints: [
      {
        title: "Get All Users",
        method: "GET",
        url: "/api/archive/admin/users?page=1&limit=10&search=user@example.com",
        description: "Mendapatkan daftar semua user (Admin Only)",
        authentication: "Bearer Token + Admin Role Required",
        rateLimit: "Admin Limiter (50/15min)",
        service: "Archive Service (via API Gateway)",
        headers: ["Authorization: Bearer <admin_token>"],
        queryParams: [
          "page: Page number (default: 1)",
          "limit: Items per page (default: 10, max: 100)",
          "search: Search by email or username",
          "user_type: Filter by user type (user, admin, superadmin, moderator)",
          "is_active: Filter by active status (true/false)",
        ],
      },
      {
        title: "Get User by ID",
        method: "GET",
        url: "/api/archive/admin/users/:userId",
        description: "Mendapatkan detail user berdasarkan ID (untuk admin)",
        authentication: "Bearer Token + Admin Role Required",
        rateLimit: "Admin Limiter (50/15min)",
        service: "Archive Service (via API Gateway)",
        headers: ["Authorization: Bearer <admin_token>"],
        pathParams: ["userId: UUID user yang akan diambil"],
      },
      {
        title: "Update User Token Balance",
        method: "PUT",
        url: "/api/archive/admin/users/:userId/token-balance",
        description: "Update token balance user (untuk admin)",
        authentication: "Bearer Token + Admin Role Required",
        rateLimit: "Admin Limiter (50/15min)",
        service: "Archive Service (via API Gateway)",
        headers: [
          "Authorization: Bearer <admin_token>",
          "Content-Type: application/json",
        ],
        pathParams: ["userId: UUID user yang akan diupdate"],
        body: {
          tokenBalance: 100,
        },
      },
      {
        title: "Delete User (Admin)",
        method: "DELETE",
        url: "/api/archive/admin/users/:userId",
        description: "Hapus user secara permanen (soft delete) - hanya untuk admin",
        authentication: "Bearer Token + Admin Role Required (admin atau superadmin)",
        rateLimit: "Admin Limiter (50/15min)",
        service: "Archive Service (via API Gateway)",
        headers: ["Authorization: Bearer <admin_token>"],
        pathParams: ["userId: UUID user yang akan dihapus"],
        response: {
          success: true,
          message: "User deleted successfully",
          data: {
            deletedUser: {
              id: "550e8400-e29b-41d4-a716-446655440000",
              originalEmail: "user@example.com",
              deletedAt: "2024-01-15T10:30:00.000Z"
            }
          }
        },
        warning: "Endpoint ini melakukan soft delete dengan mengubah email user menjadi format deleted_{timestamp}_{original_email}. Token balance user akan direset ke 0. Hanya admin dengan role admin atau superadmin yang dapat mengakses endpoint ini. Operasi ini tidak dapat di-undo.",
      },
    ],
  },

  assessment: {
    title: "Assessment Service",
    description:
      "Service untuk submit dan monitoring assessment AI-Driven Talent Mapping",
    endpoints: [
      {
        title: "Submit Assessment",
        method: "POST",
        url: "/api/assessment/submit",
        description: "Submit assessment data untuk diproses AI",
        headers: [
          "Authorization: Bearer <token>",
          "Content-Type: application/json",
          "X-Idempotency-Key: <unique_key> (optional)",
        ],
        body: {
          assessmentName: "AI-Driven Talent Mapping",
          riasec: {
            realistic: 75,
            investigative: 80,
            artistic: 65,
            social: 70,
            enterprising: 85,
            conventional: 60,
          },
          ocean: {
            openness: 80,
            conscientiousness: 75,
            extraversion: 70,
            agreeableness: 85,
            neuroticism: 40,
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
            spirituality: 60,
          },
        },
        validation: [
          'assessmentName: Must be one of "AI-Driven Talent Mapping", "AI-Based IQ Test", or "Custom Assessment"',
          "riasec: RIASEC assessment with 6 dimensions (realistic, investigative, artistic, social, enterprising, conventional)",
          "ocean: Big Five personality traits (openness, conscientiousness, extraversion, agreeableness, neuroticism)",
          "viaIs: VIA-IS character strengths - all 24 strengths must be provided",
          "All scores must be integers between 0-100",
        ],
        response: {
          success: true,
          data: {
            jobId: "uuid",
            status: "queued",
            estimatedProcessingTime: "2-5 minutes",
            queuePosition: 3,
            tokenCost: 1,
            remainingTokens: 9,
          },
        },
      },
      {
        title: "Get Assessment Status",
        method: "GET",
        url: "/api/assessment/status/:jobId",
        description: "Cek status assessment yang sedang diproses",
        headers: ["Authorization: Bearer <token>"],
      },
      {
        title: "Get Queue Status",
        method: "GET",
        url: "/api/assessment/queue/status",
        description: "Cek status antrian assessment",
        headers: ["Authorization: Bearer <token>"],
      },
    ],
  },

  archive: {
    title: "Archive Service",
    description: "Archive Service menyediakan API untuk mengelola hasil analisis assessment dan job tracking. API ini diakses melalui API Gateway pada port 3000 dengan prefix /api/archive/. Service internal berjalan pada port 3002.",
    serviceInfo: {
      serviceName: "archive-service",
      internalPort: 3002,
      externalAccess: "Via API Gateway (Port 3000)",
      baseUrl: "http://localhost:3000/api/archive/",
      version: "1.0.0"
    },
    rateLimiting: "5000 requests per 15 minutes",
    endpoints: [
      // Analysis Results Endpoints
      {
        title: "Get User Results",
        method: "GET",
        url: "/api/archive/results?page=1&limit=10&status=completed&sort=created_at&order=DESC",
        description: "Mendapatkan daftar hasil analisis untuk user yang terautentikasi",
        headers: ["Authorization: Bearer <token>"],
        queryParams: [
          "page (number, default: 1) - Halaman data",
          "limit (number, default: 10) - Jumlah data per halaman",
          "status (string, optional) - Filter berdasarkan status",
          "sort (string, default: 'created_at') - Field untuk sorting",
          "order (string, default: 'DESC') - Urutan sorting"
        ],
        response: {
          success: true,
          message: "Results retrieved successfully",
          data: {
            results: ["..."],
            pagination: {
              page: 1,
              limit: 10,
              total: 50,
              totalPages: 5
            }
          }
        }
      },
      {
        title: "Get Specific Result",
        method: "GET",
        url: "/api/archive/results/:id",
        description: "Mendapatkan detail hasil analisis berdasarkan ID",
        headers: ["Authorization: Bearer <token>"],
        response: {
          success: true,
          data: {
            id: "uuid",
            user_id: "uuid",
            assessment_data: "...",
            persona_profile: "...",
            status: "completed",
            error_message: null,
            assessment_name: "AI-Driven Talent Mapping",
            created_at: "timestamp",
            updated_at: "timestamp"
          }
        },
        fieldDescriptions: [
          "assessment_data: Data assessment yang dikirim user (RIASEC, OCEAN, VIA-IS)",
          "persona_profile: Hasil analisis dan profil persona yang dihasilkan",
          "status: Status hasil analisis ('completed', 'processing', 'failed')",
          "error_message: Pesan error jika status 'failed', null jika berhasil"
        ]
      },
      {
        title: "Update Result",
        method: "PUT",
        url: "/api/archive/results/:id",
        description: "Memperbarui hasil analisis (hanya pemilik atau admin)",
        headers: [
          "Authorization: Bearer <token>",
          "Content-Type: application/json"
        ],
        body: {
          assessment_data: "...",
          persona_profile: "...",
          status: "completed"
        }
      },
      {
        title: "Delete Result",
        method: "DELETE",
        url: "/api/archive/results/:id",
        description: "Menghapus hasil analisis (hanya pemilik)",
        headers: ["Authorization: Bearer <token>"],
        response: {
          success: true,
          message: "Analysis result deleted successfully"
        }
      },

      // Analysis Jobs Endpoints
      {
        title: "Get User Jobs",
        method: "GET",
        url: "/api/archive/jobs?page=1&limit=10&status=processing&assessment_name=AI-Driven Talent Mapping",
        description: "Mendapatkan daftar job analisis untuk user yang terautentikasi",
        headers: ["Authorization: Bearer <token>"],
        queryParams: [
          "page (number, default: 1)",
          "limit (number, default: 10)",
          "status (string, optional) - pending, processing, completed, failed",
          "assessment_name (string, optional)",
          "sort (string, default: 'created_at')",
          "order (string, default: 'DESC')"
        ],
        response: {
          success: true,
          message: "Jobs retrieved successfully",
          data: {
            jobs: ["..."],
            total: 25
          }
        }
      },
      {
        title: "Get Job Status",
        method: "GET",
        url: "/api/archive/jobs/:jobId",
        description: "Mendapatkan status job berdasarkan job ID",
        headers: ["Authorization: Bearer <token>"],
        response: {
          success: true,
          message: "Job retrieved successfully",
          data: {
            job_id: "string",
            user_id: "uuid",
            status: "processing",
            assessment_name: "string",
            created_at: "timestamp",
            updated_at: "timestamp",
            result_id: "uuid"
          }
        }
      },
      {
        title: "Get Job Statistics",
        method: "GET",
        url: "/api/archive/jobs/stats",
        description: "Mendapatkan statistik job untuk user yang terautentikasi",
        headers: ["Authorization: Bearer <token>"],
        response: {
          success: true,
          message: "Job statistics retrieved successfully",
          data: {
            total_jobs: 50,
            pending: 5,
            processing: 2,
            completed: 40,
            failed: 3,
            success_rate: 0.94
          }
        }
      },
      {
        title: "Delete Job",
        method: "DELETE",
        url: "/api/archive/jobs/:jobId",
        description: "Menghapus/membatalkan job (hanya pemilik)",
        headers: ["Authorization: Bearer <token>"]
      },

      // Statistics Endpoints
      {
        title: "Get User Statistics",
        method: "GET",
        url: "/api/archive/stats",
        description: "Mendapatkan statistik untuk user yang terautentikasi",
        headers: ["Authorization: Bearer <token>"],
        response: {
          success: true,
          message: "Statistics retrieved successfully",
          data: {
            total_results: 25,
            total_jobs: 30,
            completed_assessments: 25,
            archetype_distribution: "...",
            recent_activity: ["..."]
          }
        }
      },
      {
        title: "Get User Overview",
        method: "GET",
        url: "/api/archive/stats/overview",
        description: "Mendapatkan overview statistik untuk dashboard user",
        headers: ["Authorization: Bearer <token>"],
        response: {
          success: true,
          message: "Overview retrieved successfully",
          data: {
            summary: {
              total_assessments: 25,
              this_month: 5,
              success_rate: 0.96
            },
            recent_results: ["..."],
            archetype_summary: "..."
          }
        }
      },

      // Unified API v1 Endpoints
      {
        title: "Unified Statistics",
        method: "GET",
        url: "/api/archive/v1/stats?type=user&scope=overview&timeRange=30 days",
        description: "Endpoint statistik terpadu dengan parameter fleksibel",
        headers: ["Authorization: Bearer <token>"],
        queryParams: [
          "type (string) - user, system, demographic, performance",
          "scope (string) - overview, detailed, analysis, summary",
          "timeRange (string) - '1 day', '7 days', '30 days', '90 days'"
        ],
        warning: "Parameter type dengan nilai 'system', 'demographic', atau 'performance' memerlukan autentikasi internal service"
      },
      {
        title: "Unified Data Retrieval",
        method: "GET",
        url: "/api/archive/v1/data/:type?page=1&limit=10",
        description: "Endpoint pengambilan data terpadu",
        headers: ["Authorization: Bearer <token>"],
        queryParams: [
          "type (string) - results, jobs, demographics",
          "page (number, default: 1)",
          "limit (number, default: 10)",
          "sort (string)",
          "order (string)"
        ]
      }
    ],
  },

  websocket: {
    title: "WebSocket Notifications",
    description: "Real-time notifications melalui Socket.IO via API Gateway",
    connection: {
      url: "api.chhrone.web.id",
      events: ["analysis-started", "analysis-complete", "analysis-failed"],
      example: `
import { io } from 'socket.io-client';

const socket = io('api.chhrone.web.id', {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  socket.emit('authenticate', { token: yourJWTToken });
});

socket.on('analysis-complete', (data) => {
  console.log('Analysis completed:', data);
});

socket.connect();
      `,
    },
  },

  errors: {
    title: "Error Handling",
    description: "Standard error response dan HTTP status codes untuk semua services",
    standardResponse: {
      success: false,
      error: {
        code: "ERROR_CODE",
        message: "Human readable error message",
        details: {},
      },
      timestamp: "2024-01-01T00:00:00.000Z",
    },
    statusCodes: [
      "200 - Success",
      "201 - Created",
      "400 - Bad Request / Validation Error",
      "401 - Unauthorized",
      "403 - Forbidden",
      "404 - Not Found",
      "409 - Conflict (e.g., email exists)",
      "429 - Rate Limit Exceeded",
      "500 - Internal Server Error",
      "503 - Service Unavailable",
    ],
    authServiceErrors: [
      "VALIDATION_ERROR (400) - Request validation failed",
      "UNAUTHORIZED (401) - Missing or invalid authentication",
      "FORBIDDEN (403) - Insufficient permissions",
      "USER_NOT_FOUND (404) - User not found",
      "EMAIL_EXISTS (409) - Email already registered",
      "USERNAME_EXISTS (409) - Username already taken",
      "INVALID_CREDENTIALS (401) - Invalid login credentials",
      "INSUFFICIENT_BALANCE (400) - Insufficient token balance",
      "PROFILE_NOT_FOUND (404) - User profile not found",
      "ACCESS_DENIED (403) - User does not have access to resource",
      "RATE_LIMIT_EXCEEDED (429) - Too many requests",
      "INTERNAL_ERROR (500) - Internal server error",
    ],
    rateLimiting: {
      title: "Rate Limiting",
      description: "Protection against brute force attacks",
      limits: [
        "Auth Endpoints: 100 requests per 15 minutes per IP",
        "Admin Endpoints: 50 requests per 15 minutes per IP",
        "General Gateway: 5000 requests per 15 minutes",
      ],
    },
    securityFeatures: [
      "JWT Authentication: Secure token-based authentication",
      "Password Hashing: Bcrypt dengan salt rounds",
      "Rate Limiting: Protection against brute force attacks",
      "Input Validation: Comprehensive request validation",
      "Role-based Access: Admin/User role separation",
      "Audit Logging: All authentication events logged",
      "CORS Protection: Cross-origin request protection",
      "Helmet Security: Security headers implementation",
    ],
    validationNotes: {
      title: "Validation Notes & Known Issues",
      passwordValidation: [
        "Admin Registration: uppercase + lowercase + number + special character required",
        "Admin Password Change: only letter + number required (inconsistent)",
        "User Registration/Password Change: letter + number required",
        "Recommendation: Standardize to use strong validation for all admin operations",
      ],
      tokenBalance: [
        "Default token balance is configurable via DEFAULT_TOKEN_BALANCE environment variable",
        "Falls back to 5 if not set, not 100 as shown in some examples",
      ],
      batchRegistration: [
        "Currently has basic validation in controller only",
        "No Joi schema validation middleware applied",
        "Maximum 50 users per batch enforced",
      ],
    },
  },

  chatbot: {
    title: "Chatbot Service",
    description: "Chatbot Service menyediakan API untuk mengelola percakapan AI dan integrasi dengan assessment. API ini diakses melalui API Gateway pada port 3000 dengan prefix /api/chatbot/. Service ini mendukung percakapan real-time dengan AI, integrasi assessment untuk personalisasi, dan berbagai fitur analitik penggunaan.",
    serviceInfo: {
      serviceName: "chatbot-service",
      internalPort: 3006,
      externalAccess: "Via API Gateway (Port 3000)",
      baseUrl: "http://localhost:3000/api/chatbot/",
      version: "1.0.0"
    },
    authentication: "Semua endpoint eksternal memerlukan autentikasi JWT token yang diperoleh dari Auth Service. Header required: Authorization: Bearer <jwt_token>",
    rateLimiting: {
      freeModelEndpoints: "20 requests per minute",
      messageEndpoints: "50 requests per 5 minutes",
      generalAPI: "1000 requests per 15 minutes",
      burstProtection: "5 requests per 10 seconds"
    },
    endpoints: [
      // Conversation Management Endpoints
      {
        title: "Create Conversation",
        method: "POST",
        url: "/api/chatbot/conversations",
        description: "Membuat percakapan baru dengan AI chatbot",
        authentication: "Bearer Token Required",
        headers: [
          "Authorization: Bearer <jwt_token>",
          "Content-Type: application/json"
        ],
        body: {
          title: "My Assessment Discussion",
          context: "assessment",
          metadata: {
            assessment_id: "uuid",
            persona_type: "string"
          }
        },
        response: {
          success: true,
          message: "Conversation created successfully",
          data: {
            id: "uuid",
            title: "My Assessment Discussion",
            context: "assessment",
            status: "active",
            created_at: "timestamp",
            updated_at: "timestamp",
            user_id: "uuid",
            metadata: {}
          }
        }
      },
      {
        title: "Get User Conversations",
        method: "GET",
        url: "/api/chatbot/conversations",
        description: "Mendapatkan daftar percakapan untuk user yang terautentikasi",
        authentication: "Bearer Token Required",
        headers: ["Authorization: Bearer <jwt_token>"],
        queryParams: [
          "page (number, default: 1) - Halaman data",
          "limit (number, default: 10) - Jumlah data per halaman",
          "status (string, optional) - Filter berdasarkan status (active, archived)",
          "context (string, optional) - Filter berdasarkan konteks (general, assessment)",
          "sort (string, default: 'updated_at') - Field untuk sorting",
          "order (string, default: 'DESC') - Urutan sorting"
        ],
        response: {
          success: true,
          message: "Conversations retrieved successfully",
          data: {
            conversations: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 25,
              totalPages: 3
            }
          }
        }
      },
      {
        title: "Get Specific Conversation",
        method: "GET",
        url: "/api/chatbot/conversations/:id",
        description: "Mendapatkan detail percakapan berdasarkan ID",
        authentication: "Bearer Token Required",
        headers: ["Authorization: Bearer <jwt_token>"],
        pathParams: ["id (UUID) - ID percakapan"],
        queryParams: ["include_messages (boolean, default: false) - Sertakan pesan dalam response"],
        response: {
          success: true,
          data: {
            id: "uuid",
            title: "string",
            context: "assessment",
            status: "active",
            user_id: "uuid",
            metadata: {},
            created_at: "timestamp",
            updated_at: "timestamp",
            messages: []
          }
        }
      },
      {
        title: "Update Conversation",
        method: "PUT",
        url: "/api/chatbot/conversations/:id",
        description: "Memperbarui percakapan (hanya pemilik)",
        authentication: "Bearer Token Required",
        headers: [
          "Authorization: Bearer <jwt_token>",
          "Content-Type: application/json"
        ],
        pathParams: ["id (UUID) - ID percakapan"],
        body: {
          title: "Updated Title",
          status: "archived",
          metadata: {}
        }
      },
      {
        title: "Delete Conversation",
        method: "DELETE",
        url: "/api/chatbot/conversations/:id",
        description: "Menghapus percakapan (hanya pemilik)",
        authentication: "Bearer Token Required",
        headers: ["Authorization: Bearer <jwt_token>"],
        pathParams: ["id (UUID) - ID percakapan"]
      },

      // Message Management Endpoints
      {
        title: "Send Message",
        method: "POST",
        url: "/api/chatbot/conversations/:conversationId/messages",
        description: "Mengirim pesan ke AI dan mendapatkan response",
        authentication: "Bearer Token Required",
        headers: [
          "Authorization: Bearer <jwt_token>",
          "Content-Type: application/json"
        ],
        pathParams: ["conversationId (UUID) - ID percakapan"],
        body: {
          content: "Bagaimana cara mengembangkan karir di bidang teknologi?",
          type: "user",
          metadata: {
            context: "career_guidance"
          }
        },
        response: {
          success: true,
          message: "Message sent successfully",
          data: {
            user_message: {
              id: "uuid",
              content: "user message",
              type: "user",
              timestamp: "timestamp"
            },
            ai_response: {
              id: "uuid",
              content: "AI response",
              type: "assistant",
              timestamp: "timestamp",
              model_used: "qwen/qwen3-235b-a22b-07-25:free",
              tokens_used: 150
            }
          }
        }
      },
      {
        title: "Get Conversation Messages",
        method: "GET",
        url: "/api/chatbot/conversations/:conversationId/messages",
        description: "Mendapatkan pesan dalam percakapan",
        authentication: "Bearer Token Required",
        headers: ["Authorization: Bearer <jwt_token>"],
        pathParams: ["conversationId (UUID) - ID percakapan"],
        queryParams: [
          "page (number, default: 1)",
          "limit (number, default: 50)",
          "order (string, default: 'ASC') - Urutan pesan"
        ],
        response: {
          success: true,
          data: {
            messages: [],
            pagination: {}
          }
        }
      },
      {
        title: "Regenerate AI Response",
        method: "POST",
        url: "/api/chatbot/conversations/:conversationId/messages/:messageId/regenerate",
        description: "Regenerasi response AI untuk pesan tertentu",
        authentication: "Bearer Token Required",
        headers: ["Authorization: Bearer <jwt_token>"],
        pathParams: [
          "conversationId (UUID) - ID percakapan",
          "messageId (UUID) - ID pesan yang akan di-regenerate"
        ],
        response: {
          success: true,
          message: "Response regenerated successfully",
          data: {
            new_response: {
              id: "uuid",
              content: "New AI response",
              type: "assistant",
              timestamp: "timestamp",
              model_used: "string",
              tokens_used: 200
            }
          }
        }
      },

      // Assessment Integration Endpoints
      {
        title: "Create Conversation from Assessment",
        method: "POST",
        url: "/api/chatbot/assessment/from-assessment",
        description: "Membuat percakapan berdasarkan hasil assessment",
        authentication: "Bearer Token Required",
        headers: [
          "Authorization: Bearer <jwt_token>",
          "Content-Type: application/json"
        ],
        body: {
          assessment_result_id: "uuid",
          persona_profile: {},
          welcome_message_type: "personalized"
        },
        response: {
          success: true,
          message: "Assessment conversation created successfully",
          data: {
            conversation: {},
            welcome_message: {
              content: "Personalized welcome message",
              suggestions: [
                "Bagaimana cara mengembangkan kekuatan saya?",
                "Apa karir yang cocok untuk profil saya?"
              ]
            }
          }
        }
      },
      {
        title: "Check Assessment Readiness",
        method: "GET",
        url: "/api/chatbot/assessment/assessment-ready/:userId",
        description: "Mengecek apakah user memiliki assessment yang siap untuk chatbot",
        authentication: "Bearer Token Required",
        headers: ["Authorization: Bearer <jwt_token>"],
        pathParams: ["userId (UUID) - ID user"],
        response: {
          success: true,
          data: {
            ready: true,
            assessment_results: [],
            latest_result: {}
          }
        }
      },
      {
        title: "Generate Conversation Suggestions",
        method: "GET",
        url: "/api/chatbot/assessment/conversations/:conversationId/suggestions",
        description: "Mendapatkan saran pertanyaan berdasarkan konteks percakapan",
        authentication: "Bearer Token Required",
        headers: ["Authorization: Bearer <jwt_token>"],
        pathParams: ["conversationId (UUID) - ID percakapan"],
        response: {
          success: true,
          data: {
            suggestions: [
              "Bagaimana cara meningkatkan skill komunikasi?",
              "Apa langkah selanjutnya dalam pengembangan karir?",
              "Bagaimana cara mengatasi kelemahan saya?"
            ],
            context: "career_development"
          }
        }
      },
      {
        title: "Auto-Initialize Assessment Conversation",
        method: "POST",
        url: "/api/chatbot/assessment/auto-initialize",
        description: "Otomatis membuat percakapan berdasarkan assessment terbaru user",
        authentication: "Bearer Token Required",
        headers: [
          "Authorization: Bearer <jwt_token>",
          "Content-Type: application/json"
        ],
        body: {
          user_id: "uuid",
          conversation_type: "career_guidance"
        }
      },

      // Usage Analytics Endpoints
      {
        title: "Get User Usage Statistics",
        method: "GET",
        url: "/api/chatbot/usage/stats",
        description: "Mendapatkan statistik penggunaan untuk user",
        authentication: "Bearer Token Required",
        headers: ["Authorization: Bearer <jwt_token>"],
        queryParams: [
          "period (string, default: '30d') - Periode statistik (1d, 7d, 30d, 90d)",
          "include_details (boolean, default: false) - Sertakan detail penggunaan"
        ],
        response: {
          success: true,
          data: {
            total_conversations: 15,
            total_messages: 150,
            tokens_used: 25000,
            average_conversation_length: 10,
            most_active_day: "2024-01-15",
            model_usage: {
              "qwen/qwen3-235b-a22b-07-25:free": 120,
              "meta-llama/llama-3.2-3b-instruct:free": 30
            }
          }
        }
      },
      {
        title: "Get Usage Summary",
        method: "GET",
        url: "/api/chatbot/usage/summary",
        description: "Mendapatkan ringkasan penggunaan untuk dashboard",
        authentication: "Bearer Token Required",
        headers: ["Authorization: Bearer <jwt_token>"],
        response: {
          success: true,
          data: {
            today: {
              conversations: 3,
              messages: 25,
              tokens: 1500
            },
            this_week: {
              conversations: 12,
              messages: 120,
              tokens: 8000
            },
            limits: {
              daily_conversations: 100,
              remaining_conversations: 97,
              rate_limit_status: "normal"
            }
          }
        }
      },
      {
        title: "Get System Usage Statistics (Admin Only)",
        method: "GET",
        url: "/api/chatbot/usage/system",
        description: "Mendapatkan statistik sistem (hanya untuk admin)",
        authentication: "Bearer Token + Admin Role Required",
        headers: ["Authorization: Bearer <admin_token>"],
        queryParams: [
          "period (string, default: '7d')",
          "breakdown (string, optional) - daily, weekly, monthly"
        ],
        response: {
          success: true,
          data: {
            total_users: 500,
            active_users: 150,
            total_conversations: 2500,
            total_messages: 15000,
            model_distribution: {},
            peak_usage_hours: []
          }
        }
      },

      // Health Check Endpoints
      {
        title: "Service Health",
        method: "GET",
        url: "/api/chatbot/health",
        description: "Mengecek status kesehatan service (tidak memerlukan autentikasi)",
        authentication: "None (Public)",
        response: {
          status: "healthy",
          timestamp: "2024-01-01T00:00:00.000Z",
          uptime: 86400,
          version: "1.0.0",
          environment: "production",
          service: "chatbot-service",
          services: {
            database: {
              status: "healthy",
              connected: true
            }
          },
          system: {
            memory: {},
            platform: "linux",
            nodeVersion: "v18.17.0"
          }
        }
      },
      {
        title: "Readiness Check",
        method: "GET",
        url: "/api/chatbot/health/ready",
        description: "Mengecek kesiapan service untuk menerima traffic",
        authentication: "None (Public)"
      },
      {
        title: "Liveness Check",
        method: "GET",
        url: "/api/chatbot/health/live",
        description: "Mengecek apakah service masih hidup",
        authentication: "None (Public)"
      },
      {
        title: "Assessment Integration Health",
        method: "GET",
        url: "/api/chatbot/assessment/health",
        description: "Mengecek status integrasi assessment",
        authentication: "None (Public)",
        response: {
          success: true,
          message: "Assessment integration routes are healthy",
          timestamp: "2024-01-01T00:00:00.000Z",
          features: {
            assessment_integration: true,
            event_driven_conversations: true,
            personalized_welcome_messages: true,
            suggested_questions: true
          }
        }
      }
    ],
    errorCodes: [
      "UNAUTHORIZED (401) - Token tidak valid atau tidak ada",
      "FORBIDDEN (403) - Akses ditolak",
      "NOT_FOUND (404) - Resource tidak ditemukan",
      "VALIDATION_ERROR (400) - Data input tidak valid",
      "RATE_LIMIT_EXCEEDED (429) - Terlalu banyak request",
      "CONVERSATION_NOT_FOUND (404) - Percakapan tidak ditemukan",
      "MESSAGE_TOO_LONG (400) - Pesan terlalu panjang",
      "MODEL_UNAVAILABLE (503) - Model AI tidak tersedia",
      "INTERNAL_ERROR (500) - Server error"
    ],
    features: [
      "Rate Limiting: Service menggunakan multiple layer rate limiting untuk free models",
      "Model Fallback: Otomatis fallback ke model lain jika model utama tidak tersedia",
      "Token Management: Tracking penggunaan token untuk optimasi biaya",
      "Context Optimization: Otomatis optimasi context conversation untuk efisiensi",
      "Assessment Integration: Integrasi penuh dengan assessment service untuk personalisasi",
      "Real-time Features: Support untuk real-time conversation updates",
      "Burst Protection: Perlindungan terhadap burst requests"
    ],
    notes: [
      "Rate Limiting: Service menggunakan multiple layer rate limiting untuk free models",
      "Model Fallback: Otomatis fallback ke model lain jika model utama tidak tersedia",
      "Token Management: Tracking penggunaan token untuk optimasi biaya",
      "Context Optimization: Otomatis optimasi context conversation untuk efisiensi",
      "Assessment Integration: Integrasi penuh dengan assessment service untuk personalisasi",
      "Real-time Features: Support untuk real-time conversation updates",
      "Burst Protection: Perlindungan terhadap burst requests"
    ],
    modelSupport: {
      primaryModel: "qwen/qwen3-235b-a22b-07-25:free",
      fallbackModel: "meta-llama/llama-3.2-3b-instruct:free",
      features: [
        "Automatic model fallback when primary model is unavailable",
        "Token usage tracking for cost optimization",
        "Context length optimization for efficiency"
      ]
    },
    relatedServices: [
      "Auth Service: Untuk autentikasi dan manajemen user",
      "Archive Service: Untuk penyimpanan hasil assessment",
      "API Gateway: Sebagai entry point untuk semua request eksternal",
      "Assessment Service: Untuk integrasi hasil assessment dengan chatbot"
    ]
  },

  chatbotSession: {
    title: "Chatbot Session Details",
    description: "Penjelasan mendalam mengenai alur sesi percakapan dengan chatbot, mulai dari inisiasi hingga terminasi, termasuk manajemen konteks dan interaksi dengan AI.",
    lifecycle: {
      title: "Siklus Hidup Sesi Chat",
      steps: [
        {
          step: "1. Inisiasi Sesi",
          description: "Sebuah sesi percakapan dimulai dengan membuat sebuah 'conversation' baru melalui endpoint <code>POST /api/chatbot/conversations</code>. Ini akan menghasilkan sebuah <code>conversationId</code> yang unik.",
          details: "Untuk percakapan yang terkait dengan hasil assessment, gunakan endpoint <code>POST /api/chatbot/assessment/from-assessment</code> untuk membuat percakapan dengan konteks yang sudah dipersonalisasi."
        },
        {
          step: "2. Pengiriman Pesan",
          description: "User mengirimkan pesan dalam sebuah percakapan menggunakan endpoint <code>POST /api/chatbot/conversations/{conversationId}/messages</code>.",
          details: "Setiap pesan dari user akan dibalas oleh AI. Sistem akan menjaga riwayat percakapan untuk menjaga konteks. Konteks ini secara otomatis dioptimalkan untuk efisiensi."
        },
        {
          step: "3. Regenerasi Respons",
          description: "Jika user tidak puas dengan respons AI, mereka dapat meminta respons baru menggunakan endpoint <code>POST /api/chatbot/conversations/{conversationId}/messages/{messageId}/regenerate</code>.",
          details: "Fitur ini akan menghasilkan respons alternatif berdasarkan riwayat percakapan yang sama."
        },
        {
          step: "4. Manajemen Sesi",
          description: "User dapat melihat riwayat percakapan mereka, memperbarui judul, atau mengarsipkannya menggunakan endpoint-endpoint di bawah 'Conversation Management'.",
          details: "Mengambil detail percakapan dapat dilakukan dengan atau tanpa menyertakan pesan-pesan di dalamnya untuk efisiensi."
        },
        {
          step: "5. Terminasi Sesi",
          description: "Sesi dapat dianggap berakhir ketika user berhenti berinteraksi. Percakapan dapat dihapus menggunakan <code>DELETE /api/chatbot/conversations/{conversationId}</code>.",
          details: "Menghapus percakapan akan menghapus semua pesan yang terkait."
        }
      ]
    },
    contextManagement: {
      title: "Manajemen Konteks",
      description: "Konteks adalah kunci untuk percakapan yang relevan dan personal. Chatbot service mengelola konteks secara otomatis.",
      points: [
        "<strong>Konteks Awal:</strong> Saat membuat percakapan, Anda dapat menyediakan konteks awal, misalnya 'assessment' atau 'general'.",
        "<strong>Konteks dari Assessment:</strong> Jika percakapan dibuat dari hasil assessment, profil persona user akan secara otomatis menjadi bagian dari konteks awal, memungkinkan AI memberikan saran yang sangat personal.",
        "<strong>Riwayat Pesan:</strong> Riwayat pesan dalam satu percakapan secara otomatis digunakan sebagai konteks untuk pesan-pesan berikutnya.",
        "<strong>Optimasi Konteks:</strong> Untuk efisiensi dan performa, service secara otomatis meringkas dan mengoptimalkan konteks yang dikirim ke model AI, terutama dalam percakapan yang panjang."
      ]
    },
    interactiveFeatures: {
      title: "Fitur Interaktif",
      description: "Selain tanya jawab standar, sesi chatbot mendukung beberapa fitur interaktif.",
      features: [
        {
          name: "Saran Pertanyaan",
          description: "Berdasarkan konteks percakapan, terutama yang terkait assessment, sistem dapat memberikan saran pertanyaan relevan melalui endpoint <code>GET /api/chatbot/assessment/conversations/{conversationId}/suggestions</code>."
        },
        {
          name: "Personalisasi Berbasis Persona",
          description: "Respons AI disesuaikan dengan profil persona user yang didapat dari hasil assessment, membuat interaksi lebih relevan dan bermanfaat."
        }
      ]
    }
  },

  health: {
    title: "Health & Monitoring",
    description: "Endpoint untuk monitoring kesehatan sistem",
    endpoints: [
      {
        title: "Gateway Health",
        method: "GET",
        url: "/",
        description: "Basic health check gateway",
      },
      {
        title: "Detailed Health",
        method: "GET",
        url: "/health/detailed",
        description: "Detailed health check dengan informasi services",
      },
      {
        title: "Auth Service Health",
        method: "GET",
        url: "/api/auth/health",
        description: "Health check untuk auth service",
      },
      {
        title: "Assessment Service Health",
        method: "GET",
        url: "/api/assessment/health",
        description: "Health check untuk assessment service",
      },
      {
        title: "Archive Service Health",
        method: "GET",
        url: "/api/archive/health",
        description: "Health check untuk archive service",
      },
      {
        title: "Notification Service Health",
        method: "GET",
        url: "/api/notifications/health",
        description: "Health check untuk notification service",
      },
      {
        title: "Chatbot Service Health",
        method: "GET",
        url: "/api/chatbot/health",
        description: "Health check untuk chatbot service",
      },
    ],
  },
};
