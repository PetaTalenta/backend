/**
 * Database Connection Test Script
 * Tests database connection and checks if schema and tables exist
 */

require('dotenv').config();
const { Client } = require('pg');
const logger = require('../src/utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'atma_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
};

/**
 * Test database connection
 */
async function testConnection() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Testing database connection...');
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    
    await client.connect();
    console.log('✅ Database connection successful!');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`   PostgreSQL Version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    console.log(`   Current Time: ${result.rows[0].current_time}`);
    
    return client;
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Suggestion: Make sure PostgreSQL is running');
    } else if (error.code === '28P01') {
      console.error('   💡 Suggestion: Check username and password');
    } else if (error.code === '3D000') {
      console.error('   💡 Suggestion: Database does not exist, create it first');
    }
    
    throw error;
  }
}

/**
 * Check if schema exists
 */
async function checkSchema(client, schemaName = 'archive') {
  try {
    console.log(`\n📁 Checking schema '${schemaName}'...`);
    
    const result = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = $1
    `, [schemaName]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Schema '${schemaName}' exists`);
      return true;
    } else {
      console.log(`❌ Schema '${schemaName}' does not exist`);
      console.log(`   💡 Suggestion: Run the database initialization script:`);
      console.log(`   psql -U ${dbConfig.user} -d ${dbConfig.database} -f ../scripts/init-databases.sql`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error checking schema: ${error.message}`);
    return false;
  }
}

/**
 * Check if tables exist
 */
async function checkTables(client, schemaName = 'archive') {
  try {
    console.log(`\n📋 Checking tables in schema '${schemaName}'...`);
    
    const result = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name
    `, [schemaName]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Found ${result.rows.length} table(s):`);
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name} (${row.table_type})`);
      });
      
      // Check specifically for analysis_results table
      const analysisResultsTable = result.rows.find(row => row.table_name === 'analysis_results');
      if (analysisResultsTable) {
        console.log(`✅ Required table 'analysis_results' exists`);
        return await checkTableStructure(client, schemaName);
      } else {
        console.log(`❌ Required table 'analysis_results' does not exist`);
        return false;
      }
    } else {
      console.log(`❌ No tables found in schema '${schemaName}'`);
      console.log(`   💡 Suggestion: Run the database initialization script`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error checking tables: ${error.message}`);
    return false;
  }
}

/**
 * Check table structure
 */
async function checkTableStructure(client, schemaName = 'archive') {
  try {
    console.log(`\n🔍 Checking 'analysis_results' table structure...`);
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = 'analysis_results'
      ORDER BY ordinal_position
    `, [schemaName]);
    
    const expectedColumns = [
      'id', 'user_id', 'assessment_data', 'persona_profile', 'status', 'created_at', 'updated_at'
    ];
    
    const actualColumns = result.rows.map(row => row.column_name);
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log(`✅ All required columns exist:`);
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
      });
      
      // Check indexes
      return await checkIndexes(client, schemaName);
    } else {
      console.log(`❌ Missing columns: ${missingColumns.join(', ')}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error checking table structure: ${error.message}`);
    return false;
  }
}

/**
 * Check indexes
 */
async function checkIndexes(client, schemaName = 'archive') {
  try {
    console.log(`\n📊 Checking indexes...`);
    
    const result = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE schemaname = $1 AND tablename = 'analysis_results'
      ORDER BY indexname
    `, [schemaName]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Found ${result.rows.length} index(es):`);
      result.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
    } else {
      console.log(`⚠️  No indexes found (this may affect performance)`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error checking indexes: ${error.message}`);
    return false;
  }
}

/**
 * Test sample data
 */
async function testSampleData(client, schemaName = 'archive') {
  try {
    console.log(`\n📊 Checking sample data...`);
    
    const result = await client.query(`
      SELECT COUNT(*) as count, 
             COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
             COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
             COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM ${schemaName}.analysis_results
    `);
    
    const stats = result.rows[0];
    console.log(`✅ Found ${stats.count} record(s):`);
    console.log(`   - Completed: ${stats.completed}`);
    console.log(`   - Processing: ${stats.processing}`);
    console.log(`   - Failed: ${stats.failed}`);
    
    if (stats.count > 0) {
      // Show sample record
      const sampleResult = await client.query(`
        SELECT id, user_id, status, created_at
        FROM ${schemaName}.analysis_results
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (sampleResult.rows.length > 0) {
        const sample = sampleResult.rows[0];
        console.log(`   Latest record: ${sample.id} (${sample.status}) - ${sample.created_at}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error checking sample data: ${error.message}`);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  let client = null;
  
  try {
    console.log('🧪 Archive Service Database Test\n');
    console.log('='.repeat(50));
    
    // Test connection
    client = await testConnection();
    
    // Check schema
    const schemaExists = await checkSchema(client);
    if (!schemaExists) {
      console.log('\n❌ Cannot proceed without schema');
      return;
    }
    
    // Check tables
    const tablesExist = await checkTables(client);
    if (!tablesExist) {
      console.log('\n❌ Cannot proceed without required tables');
      return;
    }
    
    // Test sample data
    await testSampleData(client);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All database tests passed! Archive Service is ready to use.');
    
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('💥 Database tests failed. Please fix the issues above.');
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testConnection,
  checkSchema,
  checkTables,
  runTests
};
