export const authServiceData = {
  name: "Auth Service",
  description: "Authentication, user management, and administration system for ATMA. Provides secure JWT-based authentication with role-based access control.",
  baseUrl: "https://api.chhrone.web.id/api/auth",
  version: "1.0.0",
  port: "3001",
  endpoints: [
    {
      method: "POST",
      path: "/api/auth/register",
      title: "Register User",
      description: "Register a new user account with email and password.",
      authentication: null,
      rateLimit: "2500 requests per 15 minutes",
      requestBody: {
        email: "user@example.com",
        password: "myPassword1"
      },
      parameters: [
        {
          name: "email",
          type: "string",
          required: true,
          description: "Valid email format, maximum 255 characters"
        },
        {
          name: "password",
          type: "string",
          required: true,
          description: "Minimum 8 characters, must contain at least one letter and one number"
        }
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
      example: `curl -X POST https://api.chhrone.web.id/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "myPassword1"
  }'`
    },
    {
      method: "POST",
      path: "/api/auth/login",
      title: "Login User",
      description: "Authenticate user and obtain JWT token for API access.",
      authentication: null,
      rateLimit: "2500 requests per 15 minutes",
      requestBody: {
        email: "user@example.com",
        password: "myPassword1"
      },
      parameters: [
        {
          name: "email",
          type: "string",
          required: true,
          description: "Valid email format"
        },
        {
          name: "password",
          type: "string",
          required: true,
          description: "User password"
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
            token_balance: 5
          },
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        },
        message: "Login successful"
      },
      example: `curl -X POST https://api.chhrone.web.id/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "myPassword1"
  }'`
    },
    {
      method: "GET",
      path: "/api/auth/profile",
      title: "Get User Profile",
      description: "Get the profile information of the authenticated user.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
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
      example: `curl -X GET https://api.chhrone.web.id/api/auth/profile \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "PUT",
      path: "/api/auth/profile",
      title: "Update User Profile",
      description: "Update the profile information of the authenticated user.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      requestBody: {
        username: "johndoe",
        full_name: "John Doe",
        school_id: 1,
        date_of_birth: "1990-01-15",
        gender: "male"
      },
      parameters: [
        {
          name: "username",
          type: "string",
          required: false,
          description: "Alphanumeric only, 3-100 characters"
        },
        {
          name: "full_name",
          type: "string",
          required: false,
          description: "Maximum 100 characters"
        },
        {
          name: "school_id",
          type: "integer",
          required: false,
          description: "Positive integer"
        },
        {
          name: "date_of_birth",
          type: "string",
          required: false,
          description: "ISO date format (YYYY-MM-DD), cannot be future date"
        },
        {
          name: "gender",
          type: "string",
          required: false,
          description: "Must be one of: 'male', 'female'"
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
            token_balance: 5
          },
          profile: {
            full_name: "John Doe",
            date_of_birth: "1990-01-15",
            gender: "male",
            school_id: 1
          }
        },
        message: "Profile updated successfully"
      },
      example: `curl -X PUT https://api.chhrone.web.id/api/auth/profile \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "johndoe",
    "full_name": "John Doe",
    "school_id": 1,
    "date_of_birth": "1990-01-15",
    "gender": "male"
  }'`
    },
    {
      method: "POST",
      path: "/api/auth/change-password",
      title: "Change Password",
      description: "Change the password for the authenticated user.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      requestBody: {
        currentPassword: "oldPassword1",
        newPassword: "newPassword2"
      },
      parameters: [
        {
          name: "currentPassword",
          type: "string",
          required: true,
          description: "Current user password"
        },
        {
          name: "newPassword",
          type: "string",
          required: true,
          description: "Minimum 8 characters, must contain at least one letter and one number"
        }
      ],
      response: {
        success: true,
        message: "Password changed successfully"
      },
      example: `curl -X POST https://api.chhrone.web.id/api/auth/change-password \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "currentPassword": "oldPassword1",
    "newPassword": "newPassword2"
  }'`
    },
    {
      method: "GET",
      path: "/api/auth/token-balance",
      title: "Get Token Balance",
      description: "Get the current token balance for the authenticated user.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      response: {
        success: true,
        data: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          tokenBalance: 5,
          lastUpdated: "2024-01-15T10:30:00.000Z"
        }
      },
      example: `curl -X GET https://api.chhrone.web.id/api/auth/token-balance \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "DELETE",
      path: "/api/auth/account",
      title: "Delete Account",
      description: "Delete the authenticated user's account (soft delete). This operation cannot be undone.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      response: {
        success: true,
        message: "Account deleted successfully",
        data: {
          deletedAt: "2024-01-15T10:30:00.000Z",
          originalEmail: "user@example.com"
        }
      },
      example: `curl -X DELETE https://api.chhrone.web.id/api/auth/account \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/auth/logout",
      title: "Logout User",
      description: "Logout the authenticated user and invalidate the JWT token.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      response: {
        success: true,
        message: "Logout successful"
      },
      example: `curl -X POST https://api.chhrone.web.id/api/auth/logout \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    }
  ]
};
