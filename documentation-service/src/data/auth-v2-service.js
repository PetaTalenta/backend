export const authV2ServiceData = {
  name: "Auth Service V2 (Firebase)",
  description: "Firebase-based authentication service for ATMA. Provides secure authentication using Firebase Auth with support for email/password, token refresh, and profile management.",
  baseUrl: "api.futureguide.id",
  version: "1.0.0",
  port: "3008",
  endpoints: [
    {
      method: "POST",
      path: "/api/auth/v2/register",
      title: "Register User",
      description: "Register a new user account with email and password using Firebase Authentication.",
      authentication: null,
      rateLimit: "Auth Limiter (100/15min)",
      requestBody: {
        email: "user@example.com",
        password: "password123",
        displayName: "John Doe",
        photoURL: "https://example.com/photo.jpg"
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
          description: "Minimum 8 characters, must contain at least one letter and one number"
        },
        {
          name: "displayName",
          type: "string",
          required: false,
          description: "User's display name (max 100 characters)"
        },
        {
          name: "photoURL",
          type: "string",
          required: false,
          description: "URL to user's profile photo"
        }
      ],
      response: {
        success: true,
        data: {
          uid: "firebase-user-id",
          email: "user@example.com",
          displayName: "John Doe",
          photoURL: "https://example.com/photo.jpg",
          idToken: "eyJhbGciOiJSUzI1NiIs...",
          refreshToken: "AMf-vBzKhKMA...",
          expiresIn: "3600",
          createdAt: "2025-10-03T10:30:00Z"
        },
        message: "User registered successfully",
        timestamp: "2025-10-03T10:30:00Z"
      },
      errorResponses: [
        { code: "EMAIL_EXISTS", status: 400, message: "Email already exists" },
        { code: "INVALID_EMAIL", status: 400, message: "Invalid email format" },
        { code: "WEAK_PASSWORD", status: 400, message: "Password is too weak" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/auth/v2/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "displayName": "John Doe",
    "photoURL": "https://example.com/photo.jpg"
  }'`
    },
    {
      method: "POST",
      path: "/api/auth/v2/login",
      title: "Login User",
      description: "Authenticate user with email and password using Firebase Authentication.",
      authentication: null,
      rateLimit: "Auth Limiter (100/15min)",
      requestBody: {
        email: "user@example.com",
        password: "password123"
      },
      parameters: [
        {
          name: "email",
          type: "string",
          required: true,
          description: "User's email address"
        },
        {
          name: "password",
          type: "string",
          required: true,
          description: "User's password"
        }
      ],
      response: {
        success: true,
        data: {
          uid: "firebase-user-id",
          email: "user@example.com",
          displayName: "John Doe",
          photoURL: "https://example.com/photo.jpg",
          idToken: "eyJhbGciOiJSUzI1NiIs...",
          refreshToken: "AMf-vBzKhKMA...",
          expiresIn: "3600"
        },
        message: "Login successful",
        timestamp: "2025-10-03T10:30:00Z"
      },
      errorResponses: [
        { code: "EMAIL_NOT_FOUND", status: 404, message: "Email not found" },
        { code: "INVALID_PASSWORD", status: 401, message: "Invalid password" },
        { code: "USER_DISABLED", status: 403, message: "User account has been disabled" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/auth/v2/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'`
    },
    {
      method: "POST",
      path: "/api/auth/v2/refresh",
      title: "Refresh Token",
      description: "Refresh an expired ID token using a refresh token.",
      authentication: null,
      rateLimit: "Auth Limiter (100/15min)",
      requestBody: {
        refreshToken: "AMf-vBzKhKMA..."
      },
      parameters: [
        {
          name: "refreshToken",
          type: "string",
          required: true,
          description: "Firebase refresh token"
        }
      ],
      response: {
        success: true,
        data: {
          idToken: "eyJhbGciOiJSUzI1NiIs...",
          refreshToken: "AMf-vBzKhKMA...",
          expiresIn: "3600"
        },
        message: "Token refreshed successfully",
        timestamp: "2025-10-03T10:30:00Z"
      },
      errorResponses: [
        { code: "INVALID_REFRESH_TOKEN", status: 401, message: "Invalid refresh token" },
        { code: "TOKEN_EXPIRED", status: 401, message: "Refresh token has expired" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/auth/v2/refresh \\
  -H "Content-Type: application/json" \\
  -d '{
    "refreshToken": "AMf-vBzKhKMA..."
  }'`
    },
    {
      method: "POST",
      path: "/api/auth/v2/forgot-password",
      title: "Forgot Password",
      description: "Send password reset email to user's email address.",
      authentication: null,
      rateLimit: "Auth Limiter (100/15min)",
      requestBody: {
        email: "user@example.com"
      },
      parameters: [
        {
          name: "email",
          type: "string",
          required: true,
          description: "User's email address"
        }
      ],
      response: {
        success: true,
        data: null,
        message: "Password reset email sent successfully",
        timestamp: "2025-10-03T10:30:00Z"
      },
      errorResponses: [
        { code: "EMAIL_NOT_FOUND", status: 404, message: "Email not found" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/auth/v2/forgot-password \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com"
  }'`
    },
    {
      method: "POST",
      path: "/api/auth/v2/reset-password",
      title: "Reset Password",
      description: "Reset user password using the code from reset email.",
      authentication: null,
      rateLimit: "Auth Limiter (100/15min)",
      requestBody: {
        oobCode: "code-from-email",
        newPassword: "newpassword123"
      },
      parameters: [
        {
          name: "oobCode",
          type: "string",
          required: true,
          description: "Out-of-band code from password reset email"
        },
        {
          name: "newPassword",
          type: "string",
          required: true,
          description: "New password (minimum 8 characters)"
        }
      ],
      response: {
        success: true,
        data: null,
        message: "Password reset successfully",
        timestamp: "2025-10-03T10:30:00Z"
      },
      errorResponses: [
        { code: "INVALID_OOB_CODE", status: 400, message: "Invalid or expired reset code" },
        { code: "WEAK_PASSWORD", status: 400, message: "Password is too weak" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/auth/v2/reset-password \\
  -H "Content-Type: application/json" \\
  -d '{
    "oobCode": "code-from-email",
    "newPassword": "newpassword123"
  }'`
    },
    {
      method: "POST",
      path: "/api/auth/v2/logout",
      title: "Logout User",
      description: "Logout user and revoke all refresh tokens.",
      authentication: "Firebase ID Token Required (Bearer)",
      rateLimit: "5000 requests per 15 minutes",
      requestBody: {
        refreshToken: "AMf-vBzKhKMA..."
      },
      parameters: [
        {
          name: "refreshToken",
          type: "string",
          required: true,
          description: "Firebase refresh token to revoke"
        }
      ],
      response: {
        success: true,
        data: null,
        message: "Logout successful",
        timestamp: "2025-10-03T10:30:00Z"
      },
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid Firebase token" }
      ],
      example: `curl -X POST https://api.futureguide.id/api/auth/v2/logout \\
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "refreshToken": "AMf-vBzKhKMA..."
  }'`
    },
    {
      method: "PATCH",
      path: "/api/auth/v2/profile",
      title: "Update Profile",
      description: "Update user's display name and/or photo URL.",
      authentication: "Firebase ID Token Required (Bearer)",
      rateLimit: "5000 requests per 15 minutes",
      requestBody: {
        displayName: "New Name",
        photoURL: "https://example.com/new-photo.jpg"
      },
      parameters: [
        {
          name: "displayName",
          type: "string",
          required: false,
          description: "New display name (max 100 characters)"
        },
        {
          name: "photoURL",
          type: "string",
          required: false,
          description: "New photo URL"
        }
      ],
      response: {
        success: true,
        data: {
          uid: "firebase-user-id",
          email: "user@example.com",
          displayName: "New Name",
          photoURL: "https://example.com/new-photo.jpg",
          updatedAt: "2025-10-03T10:30:00Z"
        },
        message: "Profile updated successfully",
        timestamp: "2025-10-03T10:30:00Z"
      },
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid Firebase token" },
        { code: "VALIDATION_ERROR", status: 400, message: "Invalid profile data" }
      ],
      example: `curl -X PATCH https://api.futureguide.id/api/auth/v2/profile \\
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "displayName": "New Name",
    "photoURL": "https://example.com/new-photo.jpg"
  }'`
    },
    {
      method: "DELETE",
      path: "/api/auth/v2/user",
      title: "Delete User Account",
      description: "Permanently delete user account. Requires password confirmation.",
      authentication: "Firebase ID Token Required (Bearer)",
      rateLimit: "5000 requests per 15 minutes",
      requestBody: {
        password: "currentpassword123"
      },
      parameters: [
        {
          name: "password",
          type: "string",
          required: true,
          description: "Current password for confirmation"
        }
      ],
      response: {
        success: true,
        data: null,
        message: "User deleted successfully",
        timestamp: "2025-10-03T10:30:00Z"
      },
      errorResponses: [
        { code: "UNAUTHORIZED", status: 401, message: "Missing or invalid Firebase token" },
        { code: "INVALID_PASSWORD", status: 401, message: "Incorrect password" }
      ],
      example: `curl -X DELETE https://api.futureguide.id/api/auth/v2/user \\
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "password": "currentpassword123"
  }'`
    },
    {
      method: "GET",
      path: "/api/auth/v2/health",
      title: "Health Check",
      description: "Check the health status of Auth V2 service.",
      authentication: null,
      rateLimit: null,
      response: {
        success: true,
        data: {
          status: "healthy",
          timestamp: "2025-10-03T10:30:00Z",
          service: "auth-service",
          version: "1.0.0"
        },
        message: "Service is healthy",
        timestamp: "2025-10-03T10:30:00Z"
      },
      errorResponses: [],
      example: `curl -X GET https://api.futureguide.id/api/auth/v2/health`
    }
  ]
};

