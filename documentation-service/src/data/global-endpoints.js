export const globalEndpointsData = {
  name: "Global Endpoints",
  description: "Global API endpoints yang tersedia di root level API Gateway untuk health checks, monitoring, dan informasi sistem umum.",
  baseUrl: "api.futureguide.id",
  version: "1.0.0",
  port: "3000",
  endpoints: [
    {
      method: "GET",
      path: "/health",
      title: "Global Health Check",
      description: "Main health check endpoint untuk memeriksa status semua services dalam sistem ATMA. Endpoint ini memberikan overview kesehatan seluruh sistem.",
      authentication: null,
      rateLimit: "No limit",
      response: {
        success: true,
        status: "healthy",
        service: "api-gateway",
        version: "1.0.0",
        timestamp: "2024-01-01T00:00:00.000Z",
        uptime: 3600.5,
        environment: "production",
        services: {
          auth: "healthy",
          assessment: "healthy", 
          archive: "healthy",
          notification: "healthy",
          chatbot: "healthy"
        }
      },
      example: `curl -X GET https://api.futureguide.id/health`
    },
    {
      method: "GET",
      path: "/health/detailed",
      title: "Detailed Health Check",
      description: "Detailed health check dengan informasi lengkap status semua services, response time, dan metrics.",
      authentication: null,
      rateLimit: "No limit",
      response: {
        success: true,
        status: "healthy",
        service: "api-gateway",
        version: "1.0.0",
        timestamp: "2024-01-01T00:00:00.000Z",
        uptime: 3600.5,
        environment: "production",
        services: {
          auth: {
            status: "healthy",
            url: "http://localhost:3001",
            responseTime: "45ms",
            lastChecked: "2024-01-01T00:00:00.000Z"
          },
          archive: {
            status: "healthy",
            url: "http://localhost:3002",
            responseTime: "32ms",
            lastChecked: "2024-01-01T00:00:00.000Z"
          },
          assessment: {
            status: "healthy",
            url: "http://localhost:3003",
            responseTime: "67ms",
            lastChecked: "2024-01-01T00:00:00.000Z"
          },
          notification: {
            status: "healthy",
            url: "http://localhost:3005",
            responseTime: "28ms",
            lastChecked: "2024-01-01T00:00:00.000Z"
          },
          chatbot: {
            status: "healthy",
            url: "http://localhost:3006",
            responseTime: "89ms",
            lastChecked: "2024-01-01T00:00:00.000Z"
          }
        },
        summary: {
          total: 5,
          healthy: 5,
          unhealthy: 0
        }
      },
      example: `curl -X GET https://api.futureguide.id/health/detailed`
    },
    {
      method: "GET",
      path: "/health/ready",
      title: "Readiness Probe",
      description: "Kubernetes readiness probe endpoint untuk memeriksa apakah sistem siap menerima traffic.",
      authentication: null,
      rateLimit: "No limit",
      response: {
        status: "ready",
        timestamp: "2024-01-01T00:00:00.000Z",
        services: [
          {
            service: "auth",
            ready: true
          },
          {
            service: "archive", 
            ready: true
          },
          {
            service: "assessment",
            ready: true
          }
        ]
      },
      example: `curl -X GET https://api.futureguide.id/health/ready`
    },
    {
      method: "GET",
      path: "/health/live",
      title: "Liveness Probe",
      description: "Kubernetes liveness probe endpoint untuk memeriksa apakah API Gateway masih hidup dan responsif.",
      authentication: null,
      rateLimit: "No limit",
      response: {
        status: "alive",
        timestamp: "2024-01-01T00:00:00.000Z",
        uptime: 3600.5
      },
      example: `curl -X GET https://api.futureguide.id/health/live`
    },
    {
      method: "GET",
      path: "/",
      title: "API Gateway Info",
      description: "Root endpoint yang memberikan informasi umum tentang API Gateway dan services yang tersedia.",
      authentication: null,
      rateLimit: "No limit",
      response: {
        success: true,
        message: "ATMA API Gateway is running",
        version: "1.0.0",
        timestamp: "2024-01-01T00:00:00.000Z",
        services: {
          auth: "http://localhost:3001",
          archive: "http://localhost:3002",
          assessment: "http://localhost:3003",
          notification: "http://localhost:3005",
          chatbot: "http://localhost:3006"
        },
        documentation: {
          health: "/health",
          detailedHealth: "/health/detailed",
          ready: "/health/ready",
          live: "/health/live"
        }
      },
      example: `curl -X GET https://api.futureguide.id/`
    }
  ],
  notes: [
    "Health check endpoints tidak memerlukan autentikasi",
    "Endpoint ini digunakan untuk monitoring dan orchestration (Kubernetes, Docker)",
    "Response time untuk health checks biasanya < 100ms",
    "Status 'degraded' akan dikembalikan jika ada service yang tidak sehat",
    "Readiness probe akan mengembalikan 503 jika critical services tidak tersedia"
  ]
};
