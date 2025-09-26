export const adminServiceData = {
  name: "Admin Service",
  description: "Admin orchestrator service for ATMA. Provides centralized admin management by proxying requests to auth-service and archive-service. Handles admin authentication, user management, and token balance operations.",
  baseUrl: "api.futureguide.id",
  version: "1.0.0",
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
    }
  ]
};
