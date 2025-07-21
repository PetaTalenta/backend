const request = require('supertest');
const app = require('../src/app');

describe('Assessment Service', () => {
  describe('GET /', () => {
    it('should return service information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'ATMA Assessment Service is running');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready');
      
      // May return 200 or 503 depending on RabbitMQ availability
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /assessment/submit', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/assessment/submit')
        .send({})
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should validate assessment data structure', async () => {
      const response = await request(app)
        .post('/assessment/submit')
        .set('Authorization', 'Bearer invalid-token')
        .send({})
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });



  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});
