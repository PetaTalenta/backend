const sequelize = require('../src/config/database');
const QueryPerformanceMonitor = require('../src/utils/queryPerformanceMonitor');
const { AnalysisResult } = require('../src/models');
const demographicService = require('../src/services/demographicService');

/**
 * Test script untuk mengukur performa query demografis
 */

const monitor = new QueryPerformanceMonitor(sequelize);

async function testDemographicPerformance() {
  try {
    console.log('🚀 Starting demographic query performance tests...\n');

    // Test 1: Basic demographic overview
    console.log('📊 Testing demographic overview...');
    await monitor.monitorQuery('demographic_overview', async () => {
      return demographicService.getDemographicOverview();
    });

    // Test 2: Archetype demographics
    console.log('📊 Testing archetype demographics...');
    await monitor.monitorQuery('archetype_demographics', async () => {
      return demographicService.getArchetypeDemographics('Explorer');
    });

    // Test 3: School analytics
    console.log('📊 Testing school analytics...');
    await monitor.monitorQuery('school_analytics', async () => {
      return demographicService.getSchoolAnalytics();
    });

    // Test 4: Optimized demographics (new method)
    console.log('📊 Testing optimized demographics...');
    await monitor.monitorQuery('optimized_demographics', async () => {
      return demographicService.getOptimizedDemographics({
        gender: 'female',
        ageRange: { min: 20, max: 30 }
      });
    });

    // Test 5: Demographic trends
    console.log('📊 Testing demographic trends...');
    await monitor.monitorQuery('demographic_trends', async () => {
      return demographicService.getDemographicTrends({
        period: 'month',
        limit: 6
      });
    });

    // Test 6: AnalysisResult demographic analysis
    console.log('📊 Testing AnalysisResult demographic analysis...');
    await monitor.monitorQuery('analysis_demographic', async () => {
      return AnalysisResult.getDemographicAnalysis({
        gender: 'male',
        schoolOrigin: 'University',
        limit: 50
      });
    });

    // Generate performance report
    console.log('\n📈 Generating performance report...');
    const queryStats = monitor.getQueryStats();
    const indexEffectiveness = await monitor.getIndexEffectiveness();
    const recommendations = await monitor.generateOptimizationRecommendations();
    
    console.log('\n=== DEMOGRAPHIC QUERY PERFORMANCE REPORT ===');
    console.log('Timestamp:', new Date());
    
    console.log('\n📊 Query Performance:');
    Object.entries(queryStats).forEach(([queryName, stats]) => {
      console.log(`  ${queryName}:`);
      console.log(`    Average time: ${stats.avgTime.toFixed(2)}ms`);
      console.log(`    Min time: ${stats.minTime}ms`);
      console.log(`    Max time: ${stats.maxTime}ms`);
      console.log(`    Total executions: ${stats.count}`);
      console.log(`    Slow queries: ${stats.slowQueryPercentage.toFixed(1)}%`);
      console.log(`    Error rate: ${stats.errorRate.toFixed(1)}%`);
      console.log('');
    });

    console.log('\n🔍 Index Effectiveness:');
    Object.entries(indexEffectiveness).forEach(([indexName, stats]) => {
      console.log(`  ${indexName}:`);
      if (stats.error) {
        console.log(`    Status: ${stats.status}`);
        console.log(`    Error: ${stats.error}`);
      } else {
        console.log(`    Scans: ${stats.scans}`);
        console.log(`    Tuples read: ${stats.tuplesRead}`);
        console.log(`    Tuples fetched: ${stats.tuplesFetched}`);
        console.log(`    Efficiency: ${stats.efficiency.toFixed(2)}%`);
      }
      console.log('');
    });

    console.log('\n💡 Optimization Recommendations:');
    if (recommendations.length === 0) {
      console.log('  ✅ No optimization issues detected!');
    } else {
      recommendations.forEach(rec => {
        console.log(`  ${rec.severity}: ${rec.type}`);
        console.log(`    ${rec.recommendation}`);
        if (rec.query) console.log(`    Query: ${rec.query}`);
        if (rec.index) console.log(`    Index: ${rec.index}`);
        if (rec.executionTime) console.log(`    Execution time: ${rec.executionTime}ms`);
        if (rec.efficiency) console.log(`    Efficiency: ${rec.efficiency.toFixed(2)}%`);
        console.log('');
      });
    }

    console.log('\n✅ Demographic performance test completed successfully!');

  } catch (error) {
    console.error('❌ Error during demographic performance test:', error.message);
    console.error(error.stack);
  }
}

// Test specific demographic query patterns
async function testDemographicQueryPatterns() {
  try {
    console.log('\n🔍 Testing specific demographic query patterns...\n');

    const queryPatterns = [
      {
        name: 'Gender Filter with Index',
        query: `
          EXPLAIN (ANALYZE, BUFFERS) 
          SELECT COUNT(*) 
          FROM archive.analysis_results ar
          INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
          WHERE ar.status = 'completed' AND up.gender = 'male'
        `
      },
      {
        name: 'Age Range Filter with Index',
        query: `
          EXPLAIN (ANALYZE, BUFFERS) 
          SELECT COUNT(*) 
          FROM archive.analysis_results ar
          INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
          WHERE ar.status = 'completed' 
            AND up.date_of_birth BETWEEN '1990-01-01' AND '2000-12-31'
        `
      },
      {
        name: 'Composite Demographic Filter',
        query: `
          EXPLAIN (ANALYZE, BUFFERS) 
          SELECT COUNT(*) 
          FROM archive.analysis_results ar
          INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
          WHERE ar.status = 'completed' 
            AND up.gender = 'female'
            AND up.date_of_birth BETWEEN '1995-01-01' AND '2005-12-31'
            AND up.school_origin IS NOT NULL
        `
      },
      {
        name: 'School Origin Search',
        query: `
          EXPLAIN (ANALYZE, BUFFERS) 
          SELECT COUNT(*) 
          FROM archive.analysis_results ar
          INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
          WHERE ar.status = 'completed' 
            AND up.school_origin ILIKE '%University%'
        `
      },
      {
        name: 'Archetype with Demographics',
        query: `
          EXPLAIN (ANALYZE, BUFFERS) 
          SELECT 
            ar.persona_profile->>'archetype' as archetype,
            up.gender,
            COUNT(*) as count
          FROM archive.analysis_results ar
          INNER JOIN auth.user_profiles up ON ar.user_id = up.user_id
          WHERE ar.status = 'completed'
            AND ar.persona_profile->>'archetype' = 'Explorer'
            AND up.gender IS NOT NULL
          GROUP BY ar.persona_profile->>'archetype', up.gender
        `
      }
    ];

    for (const pattern of queryPatterns) {
      console.log(`📊 ${pattern.name}:`);
      try {
        const [results] = await sequelize.query(pattern.query);
        results.forEach(row => {
          console.log(`  ${row['QUERY PLAN']}`);
        });
        console.log('');
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error during query pattern test:', error.message);
  }
}

// Test index creation verification
async function verifyIndexCreation() {
  try {
    console.log('\n🔍 Verifying index creation...\n');

    const indexQueries = [
      {
        name: 'User Profiles Indexes',
        query: `
          SELECT indexname, indexdef 
          FROM pg_indexes 
          WHERE schemaname = 'auth' 
            AND tablename = 'user_profiles'
          ORDER BY indexname
        `
      },
      {
        name: 'Schools Indexes',
        query: `
          SELECT indexname, indexdef 
          FROM pg_indexes 
          WHERE schemaname = 'public' 
            AND tablename = 'schools'
          ORDER BY indexname
        `
      },
      {
        name: 'Analysis Results Indexes',
        query: `
          SELECT indexname, indexdef 
          FROM pg_indexes 
          WHERE schemaname = 'archive' 
            AND tablename = 'analysis_results'
          ORDER BY indexname
        `
      }
    ];

    for (const indexQuery of indexQueries) {
      console.log(`📋 ${indexQuery.name}:`);
      try {
        const results = await sequelize.query(indexQuery.query, {
          type: sequelize.QueryTypes.SELECT
        });
        
        if (results.length === 0) {
          console.log('  ⚠️  No indexes found');
        } else {
          results.forEach(index => {
            console.log(`  ✅ ${index.indexname}`);
            console.log(`     ${index.indexdef}`);
          });
        }
        console.log('');
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error during index verification:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🎯 ATMA Archive Service - Demographic Query Performance Testing');
  console.log('================================================================\n');

  await verifyIndexCreation();
  await testDemographicPerformance();
  await testDemographicQueryPatterns();
  
  await sequelize.close();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testDemographicPerformance,
  testDemographicQueryPatterns,
  verifyIndexCreation
};
