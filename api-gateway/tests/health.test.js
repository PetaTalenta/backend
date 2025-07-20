const request = require('supertest');
const app = require('../src/app');

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: 'healthy',
        service: 'api-gateway',
        version: '1.0.0'
      });

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body.environment).toBe('test');
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'alive'
      });

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health with services status', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: expect.any(String),
        service: 'api-gateway',
        version: '1.0.0'
      });

      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('total');
      expect(response.body.summary).toHaveProperty('healthy');
      expect(response.body.summary).toHaveProperty('unhealthy');
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready');

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      
      // Status could be 'ready' or 'not_ready' depending on services availability
      expect(['ready', 'not_ready']).toContain(response.body.status);
    });
  });
});

describe('Root Endpoint', () => {
  describe('GET /', () => {
    it('should return gateway information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'ATMA API Gateway is running',
        version: '1.0.0'
      });

      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('documentation');
      expect(response.body.services).toHaveProperty('auth');
      expect(response.body.services).toHaveProperty('archive');
      expect(response.body.services).toHaveProperty('assessment');
    });
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'NOT_FOUND',
      message: 'Route GET /unknown-route not found'
    });

    expect(response.body).toHaveProperty('timestamp');
  });
});
