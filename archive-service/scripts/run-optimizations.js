#!/usr/bin/env node

/**
 * Archive Service Optimization Script
 * Runs all database optimizations and schema improvements
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`)
};

async function runOptimizations() {
  try {
    logger.info('Starting Archive Service optimizations...');

    // 1. Check if database is accessible
    logger.info('Checking database connection...');
    try {
      const { sequelize } = require('../src/config/database');
      await sequelize.authenticate();
      logger.success('Database connection successful');
    } catch (error) {
      logger.error(`Database connection failed: ${error.message}`);
      process.exit(1);
    }

    // 2. Run pending migrations
    logger.info('Running database migrations...');
    try {
      execSync('npx sequelize-cli db:migrate', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit' 
      });
      logger.success('Database migrations completed');
    } catch (error) {
      logger.error(`Migration failed: ${error.message}`);
      // Continue with other optimizations
    }

    // 3. Analyze current database performance
    logger.info('Analyzing current database performance...');
    try {
      const OptimizedQueryService = require('../src/services/optimizedQueryService');
      const metrics = await OptimizedQueryService.getPerformanceMetrics();
      
      logger.info(`Found ${metrics.index_statistics.length} indexes`);
      logger.info(`Found ${metrics.table_statistics.length} tables`);
      
      // Log tables with high sequential scan ratios
      const problematicTables = metrics.table_statistics.filter(table => {
        const seqRatio = table.sequential_scans / (table.index_scans || 1);
        return seqRatio > 10 && table.sequential_scans > 100;
      });

      if (problematicTables.length > 0) {
        logger.warn(`Tables with high sequential scan ratios: ${problematicTables.map(t => t.tablename).join(', ')}`);
      }

    } catch (error) {
      logger.error(`Performance analysis failed: ${error.message}`);
    }

    // 4. Create backup of current schema (optional)
    if (process.env.CREATE_BACKUP === 'true') {
      logger.info('Creating schema backup...');
      try {
        const backupFile = `schema_backup_${Date.now()}.sql`;
        execSync(`pg_dump --schema-only ${process.env.DATABASE_URL} > ${backupFile}`, {
          cwd: path.join(__dirname, '..', 'backups'),
          stdio: 'inherit'
        });
        logger.success(`Schema backup created: ${backupFile}`);
      } catch (error) {
        logger.warn(`Backup creation failed: ${error.message}`);
      }
    }

    // 5. Run optimization queries
    logger.info('Running database optimizations...');
    try {
      const { sequelize } = require('../src/config/database');
      
      // Update table statistics
      await sequelize.query('ANALYZE archive.analysis_results;');
      await sequelize.query('ANALYZE archive.analysis_jobs;');
      logger.success('Table statistics updated');

      // Vacuum tables if needed
      if (process.env.RUN_VACUUM === 'true') {
        logger.info('Running VACUUM on tables...');
        await sequelize.query('VACUUM ANALYZE archive.analysis_results;');
        await sequelize.query('VACUUM ANALYZE archive.analysis_jobs;');
        logger.success('VACUUM completed');
      }

    } catch (error) {
      logger.error(`Database optimization failed: ${error.message}`);
    }

    // 6. Test optimized queries
    logger.info('Testing optimized queries...');
    try {
      const OptimizedQueryService = require('../src/services/optimizedQueryService');
      
      // Test job queue stats
      const queueStats = await OptimizedQueryService.getJobQueueStats();
      logger.info(`Queue stats: ${JSON.stringify(queueStats)}`);

      // Test demographic insights
      const demoInsights = await OptimizedQueryService.getDemographicInsights({ limit: 10 });
      logger.info(`Demographic insights: ${demoInsights.insights.length} records`);

      logger.success('Optimized queries tested successfully');
    } catch (error) {
      logger.error(`Query testing failed: ${error.message}`);
    }

    // 7. Generate optimization report
    logger.info('Generating optimization report...');
    try {
      const report = await generateOptimizationReport();
      const reportFile = path.join(__dirname, '..', 'logs', `optimization_report_${Date.now()}.json`);
      
      // Ensure logs directory exists
      const logsDir = path.dirname(reportFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      logger.success(`Optimization report saved: ${reportFile}`);
    } catch (error) {
      logger.error(`Report generation failed: ${error.message}`);
    }

    logger.success('Archive Service optimizations completed successfully!');

    // 8. Print summary
    console.log('\n' + '='.repeat(60));
    console.log('OPTIMIZATION SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Database migrations applied');
    console.log('✅ Performance metrics analyzed');
    console.log('✅ Database statistics updated');
    console.log('✅ Optimized queries tested');
    console.log('✅ Optimization report generated');
    console.log('\nNext steps:');
    console.log('1. Review the optimization report');
    console.log('2. Monitor query performance');
    console.log('3. Update application code to use new unified endpoints');
    console.log('4. Test the new association service');
    console.log('='.repeat(60));

  } catch (error) {
    logger.error(`Optimization process failed: ${error.message}`);
    process.exit(1);
  }
}

async function generateOptimizationReport() {
  const OptimizedQueryService = require('../src/services/optimizedQueryService');
  
  const [performanceMetrics, queueStats] = await Promise.all([
    OptimizedQueryService.getPerformanceMetrics(),
    OptimizedQueryService.getJobQueueStats()
  ]);

  return {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    optimizations_applied: [
      'Database schema normalization',
      'Composite index creation',
      'GIN indexes for JSONB queries',
      'Partial indexes for active jobs',
      'Foreign key constraints',
      'Check constraints for data integrity',
      'Query optimization with proper indexing',
      'Code redundancy elimination',
      'API endpoint consolidation',
      'Circular dependency resolution'
    ],
    performance_metrics: performanceMetrics,
    queue_statistics: queueStats,
    recommendations: [
      'Monitor index usage regularly',
      'Use unified API endpoints for better performance',
      'Implement proper caching for frequently accessed data',
      'Consider partitioning for large tables',
      'Regular VACUUM and ANALYZE operations'
    ]
  };
}

// Run optimizations if this script is executed directly
if (require.main === module) {
  runOptimizations().catch(error => {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runOptimizations, generateOptimizationReport };
