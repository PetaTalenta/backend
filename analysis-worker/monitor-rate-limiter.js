#!/usr/bin/env node

/**
 * Rate Limiter Monitoring Script
 * Monitor rate limiter stats during testing
 */

const http = require('http');
const logger = require('./src/utils/logger');

class RateLimiterMonitor {
  constructor(port = 9090) {
    this.port = port;
    this.server = null;
    this.rateLimiter = null;
  }

  /**
   * Initialize monitoring server
   */
  async initialize(rateLimiterInstance) {
    this.rateLimiter = rateLimiterInstance;

    this.server = http.createServer((req, res) => {
      if (req.url === '/stats' && req.method === 'GET') {
        this.handleStatsRequest(res);
      } else if (req.url === '/health' && req.method === 'GET') {
        this.handleHealthRequest(res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`Rate Limiter Monitor started on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Handle stats request
   */
  handleStatsRequest(res) {
    try {
      const stats = this.rateLimiter.getStats();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        rateLimiter: stats,
        recommendations: this.generateRecommendations(stats)
      }, null, 2));
    } catch (error) {
      logger.error('Error handling stats request', { error: error.message });
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Handle health check
   */
  handleHealthRequest(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      rateLimiter: this.rateLimiter ? 'active' : 'inactive'
    }));
  }

  /**
   * Generate recommendations based on stats
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.throttledRequests > stats.totalRequests * 0.3) {
      recommendations.push('High throttling detected. Consider reducing WORKER_CONCURRENCY or increasing AI_RATE_LIMIT_RPM');
    }

    if (stats.averageDelay > 10000) {
      recommendations.push('Average delay is high. Consider optimizing AI_RATE_LIMIT_RPM');
    }

    if (stats.maxDelay > 30000) {
      recommendations.push('Max delay exceeded 30s. Check AI_MAX_RETRY_DELAY configuration');
    }

    if (stats.currentTokens < 2) {
      recommendations.push('Low token count. Rate limiter is working hard - monitor closely');
    }

    if (recommendations.length === 0) {
      recommendations.push('Rate limiter performing well');
    }

    return recommendations;
  }

  /**
   * Stop monitoring server
   */
  stop() {
    if (this.server) {
      this.server.close();
      logger.info('Rate Limiter Monitor stopped');
    }
  }
}

module.exports = RateLimiterMonitor;

// CLI usage
if (require.main === module) {
  const monitor = new RateLimiterMonitor(process.env.MONITOR_PORT || 9090);

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down monitor...');
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down monitor...');
    monitor.stop();
    process.exit(0);
  });
}
