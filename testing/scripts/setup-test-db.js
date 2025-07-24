#!/usr/bin/env node

/**
 * Test Database Setup Script
 * Creates and configures a separate test database for E2E testing
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.test' });

const logger = {
  info: (msg, data = {}) => console.log(`ℹ️  ${msg}`, data),
  success: (msg, data = {}) => console.log(`✅ ${msg}`, data),
  error: (msg, data = {}) => console.error(`❌ ${msg}`, data),
  warn: (msg, data = {}) => console.warn(`⚠️  ${msg}`, data)
};

class TestDatabaseSetup {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'atma_user',
      password: process.env.DB_PASSWORD || 'secret-passworrd',
      database: 'postgres', // Connect to default database first
      testDatabase: process.env.DB_NAME || 'atma_test_db'
    };
  }

  async setupTestDatabase() {
    let client = null;
    
    try {
      logger.info('Setting up test database...');
      
      // Connect to PostgreSQL server
      client = new Client(this.config);
      await client.connect();
      logger.success('Connected to PostgreSQL server');

      // Check if test database exists
      const dbExistsQuery = `
        SELECT 1 FROM pg_database WHERE datname = $1
      `;
      const dbExists = await client.query(dbExistsQuery, [this.config.testDatabase]);

      if (dbExists.rows.length === 0) {
        // Create test database
        logger.info(`Creating test database: ${this.config.testDatabase}`);
        await client.query(`CREATE DATABASE "${this.config.testDatabase}"`);
        logger.success(`Test database created: ${this.config.testDatabase}`);
      } else {
        logger.info(`Test database already exists: ${this.config.testDatabase}`);
      }

      await client.end();

      // Connect to test database and create schemas
      const testDbClient = new Client({
        ...this.config,
        database: this.config.testDatabase
      });

      await testDbClient.connect();
      logger.success('Connected to test database');

      // Create schemas
      const schemas = ['auth', 'archive', 'chatbot'];
      for (const schema of schemas) {
        await testDbClient.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
        logger.success(`Schema created/verified: ${schema}`);
      }

      // Create test data cleanup function
      await this.createCleanupFunction(testDbClient);

      await testDbClient.end();
      logger.success('Test database setup completed successfully');

    } catch (error) {
      logger.error('Failed to setup test database', { error: error.message });
      throw error;
    } finally {
      if (client && !client._ending) {
        await client.end();
      }
    }
  }

  async createCleanupFunction(client) {
    logger.info('Creating test data cleanup function...');

    const cleanupFunction = `
      CREATE OR REPLACE FUNCTION cleanup_test_data(
        older_than_hours INTEGER DEFAULT 24,
        batch_size INTEGER DEFAULT 100
      ) RETURNS INTEGER AS $$
      DECLARE
        deleted_count INTEGER := 0;
        temp_count INTEGER;
      BEGIN
        -- Clean up test users (emails containing 'testuser' and 'example.com')
        DELETE FROM auth.users
        WHERE id IN (
          SELECT id FROM auth.users
          WHERE email LIKE '%testuser%@example.com'
          AND created_at < NOW() - INTERVAL '1 hour' * older_than_hours
          LIMIT batch_size
        );

        GET DIAGNOSTICS temp_count = ROW_COUNT;
        deleted_count := deleted_count + temp_count;

        -- Clean up test conversations
        DELETE FROM chatbot.conversations
        WHERE id IN (
          SELECT c.id FROM chatbot.conversations c
          JOIN auth.users u ON c.user_id = u.id
          WHERE u.email LIKE '%testuser%@example.com'
          AND c.created_at < NOW() - INTERVAL '1 hour' * older_than_hours
          LIMIT batch_size
        );

        GET DIAGNOSTICS temp_count = ROW_COUNT;
        deleted_count := deleted_count + temp_count;

        -- Clean up test assessments
        DELETE FROM archive.assessments
        WHERE id IN (
          SELECT a.id FROM archive.assessments a
          JOIN auth.users u ON a.user_id = u.id
          WHERE u.email LIKE '%testuser%@example.com'
          AND a.created_at < NOW() - INTERVAL '1 hour' * older_than_hours
          LIMIT batch_size
        );

        GET DIAGNOSTICS temp_count = ROW_COUNT;
        deleted_count := deleted_count + temp_count;

        RETURN deleted_count;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await client.query(cleanupFunction);
    logger.success('Test data cleanup function created');
  }

  async cleanupTestData() {
    const client = new Client({
      ...this.config,
      database: this.config.testDatabase
    });

    try {
      await client.connect();
      logger.info('Running test data cleanup...');

      const result = await client.query('SELECT cleanup_test_data($1, $2)', [24, 100]);
      const deletedCount = result.rows[0].cleanup_test_data;

      logger.success(`Cleaned up ${deletedCount} test records`);
      return deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup test data', { error: error.message });
      throw error;
    } finally {
      await client.end();
    }
  }
}

// CLI interface
async function main() {
  const setup = new TestDatabaseSetup();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'setup':
        await setup.setupTestDatabase();
        break;
      case 'cleanup':
        await setup.cleanupTestData();
        break;
      default:
        logger.info('Usage: node setup-test-db.js [setup|cleanup]');
        logger.info('  setup   - Create and configure test database');
        logger.info('  cleanup - Clean up old test data');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Operation failed', { error: error.message });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestDatabaseSetup;
