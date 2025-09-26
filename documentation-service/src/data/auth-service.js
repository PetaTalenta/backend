export const authServiceData = {
  name: "Auth Service",
  description: "Authentication, user management, and administration system for ATMA. Provides secure JWT-based authentication with role-based access control.",
  baseUrl: "api.futureguide.id",
  version: "1.0.0",
  port: "3001",
  endpoints: [
    {
      method: "POST",
      path: "/api/auth/register",
      title: "Register User",
      description: "Register a new user account with username, email, and password.",
      authentication: null,
      rateLimit: "Auth Limiter (100/15min)",
      requestBody: {
        username: "johndoe",
        email: "user@example.com",
        password: "MyPassword1"
      },
      parameters: [
        {
          name: "username",
          type: "string",
          required: true,
          description: "Alphanumeric only, 3-100 characters"
        },
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
            username: "johndoe",
            user_type: "user",
            is_active: true,
            token_balance: 5,
            created_at: "2024-01-15T10:30:00.000Z"
          },
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        },
        message: "User registered successfully"
      },
      errorResponses: [
        { code: "VALIDATION_ERROR", status: 400, message: "Request validation failed" },
        { code: "EMAIL_EXISTS", status: 400, message: "Email already registered" },
        { code: "USERNAME_EXISTS", status: 400, message: "Username already taken" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "johndoe",
    "email": "user@example.com",
    "password": "MyPassword1"
  }'`
    },
    {
      method: "POST",
      path: "/api/auth/login",
      title: "Login User",
      description: "Authenticate user using email or username and obtain JWT token for API access.",
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
          required: false,
          description: "Valid email format (use either email or username)"
        },
        {
          name: "username",
          type: "string",
          required: false,
          description: "Alphanumeric 3-100 (use either username or email)"
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
      errorResponses: [
        { code: "IDENTIFIER_NOT_FOUND", status: 404, message: "Username or email not found" },
        { code: "INVALID_PASSWORD", status: 401, message: "Invalid password" }
      ],
      example: `# Login with email\ncurl -X POST https://api.futureguide.id/api/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "email": "user@example.com",\n    "password": "myPassword1"\n  }'\n\n# Login with username\ncurl -X POST https://api.futureguide.id/api/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "username": "johndoe",\n    "password": "myPassword1"\n  }'`
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
        message: "Success",
        data: {
          user: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            email: "user@example.com",
            username: "johndoe",
            user_type: "user",
            is_active: true,
            token_balance: 5,
            last_login: "2024-01-15T10:25:00.000Z",
            created_at: "2024-01-15T10:30:00.000Z",
            profile: {
              full_name: "John Doe",
              date_of_birth: "1990-01-15",
              gender: "male",
              school_id: 1,
              school: { id: 1, name: "SMA 1", city: "Jakarta", province: "DKI Jakarta" },
              school_info: {
                type: "structured",
                school_id: 1,
                school: { id: 1, name: "SMA 1", city: "Jakarta", province: "DKI Jakarta" }
              }
            }
          }
        }
      },
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid token" },
        { code: "USER_NOT_FOUND", status: 404, message: "User not found" }
      ],
      example: `curl -X GET https://api.futureguide.id/api/auth/profile \\
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
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid token" },
        { code: "VALIDATION_ERROR", status: 400, message: "Invalid data (including INVALID_SCHOOL_ID)" },
        { code: "EMAIL_EXISTS", status: 409, message: "Email already exists" },
        { code: "USERNAME_EXISTS", status: 409, message: "Username already exists" }
      ],
      example: `curl -X PUT https://api.futureguide.id/api/auth/profile \\
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
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid token" },
        { code: "USER_NOT_FOUND", status: 404, message: "User not found" },
        { code: "VALIDATION_ERROR", status: 400, message: "New password does not meet requirements or current password is incorrect" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/auth/change-password \\
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
      title: "Get Token Balance (Legacy)",
      description: "Get the current token balance for the authenticated user (legacy endpoint; prefer GET /api/auth/profile for fresh data).",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      response: {
        success: true,
        message: "Success",
        data: {
          user_id: "550e8400-e29b-41d4-a716-446655440000",
          token_balance: 5
        }
      },
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid token" },
        { code: "USER_NOT_FOUND", status: 404, message: "User not found" }
      ],
      example: `curl -X GET https://api.futureguide.id/api/auth/token-balance \\
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
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid token" },
        { code: "USER_NOT_FOUND", status: 404, message: "User not found or already inactive" }
      ],
      example: `curl -X DELETE https://api.futureguide.id/api/auth/account \\
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
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid token" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/auth/logout \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/auth/register/batch",
      title: "Batch Register Users",
      description: "Register multiple users in a single request (max 50 users).",
      authentication: null,
      rateLimit: "Auth Limiter (100/15min)",
      requestBody: {
        users: [
          { email: "user1@example.com", password: "myPassword1" },
          { email: "user2@example.com", password: "anotherPass2" }
        ]
      },
      parameters: [
        { name: "users", type: "array", required: true, description: "Array of user objects (max 50)" }
      ],
      response: {
        success: true,
        message: "Batch user registration processed successfully",
        data: { total: 2, successful: 2, failed: 0 }
      },
      example: `curl -X POST https://api.futureguide.id/api/auth/register/batch \\\n  -H "Content-Type: application/json" \\\n  -d '{\n  "users": [\n    { "email": "user1@example.com", "password": "myPassword1" },\n    { "email": "user2@example.com", "password": "anotherPass2" }\n  ]\n}'`
    },
    {
      method: "DELETE",
      path: "/api/auth/profile",
      title: "Delete Profile",
      description: "Delete only the user's profile (user_profiles table), not the account.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      response: { success: true, message: "Profile deleted successfully" },
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid token" },
        { code: "PROFILE_NOT_FOUND", status: 404, message: "Profile not found" }
      ],
      example: `curl -X DELETE https://api.futureguide.id/api/auth/profile \\\n  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/auth/schools",
      title: "List Schools",
      description: "Get list of schools with fast search and pagination.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        { name: "search", type: "string", required: false },
        { name: "city", type: "string", required: false },
        { name: "province", type: "string", required: false },
        { name: "page", type: "integer", required: false, description: "Default 1" },
        { name: "limit", type: "integer", required: false, description: "Default 20" },
        { name: "useFullText", type: "boolean", required: false, description: "Default false" }
      ],
      example: `curl -X GET "https://api.futureguide.id/api/auth/schools?search=SMA&page=1&limit=20" \\\n  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/auth/schools",
      title: "Create School",
      description: "Create a new school entry.",
      authentication: "Bearer Token Required",
      requestBody: { name: "SMA Negeri 1 Jakarta", address: "Jl. Sudirman No. 1", city: "Jakarta", province: "DKI Jakarta" },
      parameters: [
        { name: "name", type: "string", required: true },
        { name: "address", type: "string", required: false },
        { name: "city", type: "string", required: false },
        { name: "province", type: "string", required: false }
      ],
      example: `curl -X POST https://api.futureguide.id/api/auth/schools \\\n  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n  "name": "SMA Negeri 1 Jakarta",\n  "address": "Jl. Sudirman No. 1",\n  "city": "Jakarta",\n  "province": "DKI Jakarta"\n}'`
    }
  ]
};
