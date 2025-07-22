export const apiData = {
  overview: {
    title: "ATMA API Gateway",
    description:
      "ATMA API Gateway adalah entry point tunggal untuk semua komunikasi dengan backend services. Gateway ini mengelola routing, authentication, rate limiting, dan security untuk seluruh sistem ATMA (AI-Driven Talent Mapping Assessment).",
    baseUrl: "https://api.chhrone.web.id",
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
      "Sistem autentikasi menggunakan JWT token untuk sebagian besar endpoint.",
    endpoints: [
      {
        title: "Register User",
        method: "POST",
        url: "/api/auth/register",
        description: "Mendaftarkan user baru ke sistem",
        headers: ["Content-Type: application/json"],
        body: {
          email: "user@example.com",
          password: "myPassword1",
        },
        validation: [
          "email: Valid email format, maximum 255 characters, required",
          "password: Minimum 8 characters, must contain at least one letter and one number, required",
        ],
      },
      {
        title: "User Login",
        method: "POST",
        url: "/api/auth/login",
        description: "Login user dan mendapatkan JWT token",
        headers: ["Content-Type: application/json"],
        body: {
          email: "user@example.com",
          password: "myPassword1",
        },
        response: {
          success: true,
          data: {
            user: {
              id: "uuid",
              email: "user@example.com",
              user_type: "user",
              token_balance: 100,
            },
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
      },
      {
        title: "Get User Profile",
        method: "GET",
        url: "/api/auth/profile",
        description: "Mendapatkan profil user yang sedang login",
        headers: ["Authorization: Bearer <token>"],
      },
      {
        title: "Update User Profile",
        method: "PUT",
        url: "/api/auth/profile",
        description: "Update profil user",
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
          "full_name: Maximum 100 characters, optional",
          "school_id: Positive integer, optional",
          "date_of_birth: ISO date format (YYYY-MM-DD), cannot be future date, optional",
          'gender: Must be one of: "male", "female", optional',
        ],
      },
      {
        title: "Change Password",
        method: "POST",
        url: "/api/auth/change-password",
        description: "Mengubah password user",
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
        headers: ["Authorization: Bearer <token>"],
      },
      {
        title: "Get Token Balance",
        method: "GET",
        url: "/api/auth/token-balance",
        description: "Mendapatkan saldo token user",
        headers: ["Authorization: Bearer <token>"],
      },
      {
        title: "Delete User Account",
        method: "DELETE",
        url: "/api/auth/account",
        description: "Hapus akun user (soft delete)",
        headers: ["Authorization: Bearer <token>"],
        warning:
          "Operasi ini tidak dapat dibatalkan. User email akan diubah ke format deleted_{timestamp}_{original_email}",
      },
    ],
  },

  schools: {
    title: "School Management",
    description: "Endpoint untuk mengelola data sekolah",
    endpoints: [
      {
        title: "Get Schools",
        method: "GET",
        url: "/api/auth/schools",
        description: "Mendapatkan daftar semua sekolah",
        headers: ["Authorization: Bearer <token>"],
      },
      {
        title: "Create School",
        method: "POST",
        url: "/api/auth/schools",
        description: "Membuat sekolah baru",
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
        url: "/api/auth/schools/by-location?city=Jakarta",
        description: "Mendapatkan sekolah berdasarkan lokasi",
        headers: ["Authorization: Bearer <token>"],
        queryParams: ["city: Nama kota untuk filter"],
      },
    ],
  },

  admin: {
    title: "Admin Management",
    description: "Endpoint khusus untuk admin dan superadmin",
    endpoints: [
      {
        title: "Admin Login",
        method: "POST",
        url: "/api/admin/login",
        description: "Login untuk admin",
        headers: ["Content-Type: application/json"],
        body: {
          username: "admin",
          password: "Admin123!",
        },
        validation: [
          "username: Required (can be username or email)",
          "password: Required (no specific format validation for login)",
        ],
      },
      {
        title: "Register New Admin",
        method: "POST",
        url: "/api/admin/register",
        description: "Mendaftarkan admin baru (Superadmin only)",
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
      {
        title: "Get All Users",
        method: "GET",
        url: "/api/archive/admin/users?page=1&limit=10&search=user@example.com",
        description: "Mendapatkan daftar semua user (Admin Only)",
        headers: ["Authorization: Bearer <admin_token>"],
        queryParams: [
          "page: Page number (default: 1)",
          "limit: Items per page (default: 10, max: 100)",
          "search: Search by email or username",
          "user_type: Filter by user type (user, admin, superadmin, moderator)",
          "is_active: Filter by active status (true/false)",
        ],
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
    description: "Service untuk mengelola hasil analysis dan data historis",
    endpoints: [
      {
        title: "Get User Results",
        method: "GET",
        url: "/api/archive/results?page=1&limit=10&status=completed",
        description: "Mendapatkan hasil analysis user",
        headers: ["Authorization: Bearer <token>"],
        queryParams: [
          "page: Page number",
          "limit: Items per page",
          "status: Filter by status",
        ],
      },
      {
        title: "Get Specific Result",
        method: "GET",
        url: "/api/archive/results/:id",
        description: "Mendapatkan detail hasil analysis tertentu",
        headers: ["Authorization: Bearer <token>"],
      },
      {
        title: "Delete Result",
        method: "DELETE",
        url: "/api/archive/results/:id",
        description:
          "Hapus hasil analysis (user hanya bisa hapus milik sendiri)",
        headers: ["Authorization: Bearer <token>"],
        response: {
          success: true,
          message: "Analysis result deleted successfully",
        },
      },
      {
        title: "Get User Statistics",
        method: "GET",
        url: "/api/archive/stats",
        description: "Mendapatkan statistik user",
        headers: ["Authorization: Bearer <token>"],
      },
    ],
  },

  websocket: {
    title: "WebSocket Notifications",
    description: "Real-time notifications melalui Socket.IO via API Gateway",
    connection: {
      url: "http://localhost:3000",
      events: ["analysis-started", "analysis-complete", "analysis-failed"],
      example: `
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
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
    description: "Standard error response dan HTTP status codes",
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
    commonErrors: [
      "VALIDATION_ERROR (400) - Request validation failed",
      "UNAUTHORIZED (401) - Missing or invalid authentication",
      "FORBIDDEN (403) - Insufficient permissions",
      "USER_NOT_FOUND (404) - User not found",
      "EMAIL_EXISTS (409) - Email already registered",
      "INSUFFICIENT_TOKENS (402) - Not enough token balance",
      "RATE_LIMIT_EXCEEDED (429) - Too many requests",
    ],
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
    ],
  },
};
