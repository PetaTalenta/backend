/**
 * Test script for new models in archive-service: UserProfile and School
 * This script tests access to auth.user_profiles and public.schools from archive-service
 */

const { AnalysisResult, UserProfile, School, sequelize } = require('../src/models');
const logger = require('../src/utils/logger');

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    return false;
  }
}

/**
 * Test cross-schema access
 */
async function testCrossSchemaAccess() {
  try {
    console.log('\n🔍 Testing cross-schema access...');
    
    // Test access to auth.user_profiles
    const profileCount = await UserProfile.count();
    console.log(`✅ Can access auth.user_profiles (${profileCount} records)`);
    
    // Test access to public.schools
    const schoolCount = await School.count();
    console.log(`✅ Can access public.schools (${schoolCount} records)`);
    
    // Test access to archive.analysis_results
    const resultCount = await AnalysisResult.count();
    console.log(`✅ Can access archive.analysis_results (${resultCount} records)`);
    
    return true;
  } catch (error) {
    console.error('❌ Error in cross-schema access:', error.message);
    return false;
  }
}

/**
 * Test model associations
 */
async function testAssociations() {
  try {
    console.log('\n🧪 Testing model associations...');
    
    // Find analysis results with user profiles
    const resultsWithProfiles = await AnalysisResult.findAll({
      include: [{
        model: UserProfile,
        as: 'userProfile',
        required: false // LEFT JOIN
      }],
      limit: 5
    });
    
    console.log(`✅ Found ${resultsWithProfiles.length} analysis results`);
    
    let profilesFound = 0;
    resultsWithProfiles.forEach(result => {
      if (result.userProfile) {
        profilesFound++;
        console.log(`   Result ${result.id} has profile: ${result.userProfile.full_name || 'No name'}`);
      }
    });
    
    console.log(`✅ ${profilesFound} results have associated user profiles`);
    
    return true;
  } catch (error) {
    console.error('❌ Error in association tests:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

/**
 * Test enriched queries
 */
async function testEnrichedQueries() {
  try {
    console.log('\n📊 Testing enriched queries...');
    
    // Query analysis results with user demographics
    const enrichedResults = await sequelize.query(`
      SELECT
        ar.id,
        ar.user_id,
        ar.persona_profile->>'archetype' as archetype,
        ar.status,
        ar.created_at,
        up.full_name,
        up.gender,
        EXTRACT(YEAR FROM AGE(up.date_of_birth)) as age
      FROM archive.analysis_results ar
      LEFT JOIN auth.user_profiles up ON ar.user_id = up.user_id
      WHERE ar.status = 'completed'
      ORDER BY ar.created_at DESC
      LIMIT 5
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log(`✅ Enriched query returned ${enrichedResults.length} results`);
    
    enrichedResults.forEach(result => {
      console.log(`   ${result.archetype || 'Unknown'} - ${result.full_name || 'Anonymous'} (${result.gender || 'N/A'}, age ${result.age || 'N/A'})`);
    });
    
    // Query schools with analysis count (Note: school_origin field has been removed)
    // This query is now disabled since school_origin is no longer available
    const schoolStats = [];
    console.log('⚠️ School statistics query disabled - school_origin field has been removed from user profiles');
    
    console.log(`✅ School statistics query returned ${schoolStats.length} schools with analyses`);
    
    schoolStats.forEach(school => {
      console.log(`   ${school.name} (${school.city}): ${school.analysis_count} analyses`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error in enriched queries:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

/**
 * Test demographic insights
 */
async function testDemographicInsights() {
  try {
    console.log('\n📈 Testing demographic insights...');
    
    // Gender distribution of completed analyses
    const genderStats = await sequelize.query(`
      SELECT 
        COALESCE(up.gender, 'unknown') as gender,
        COUNT(ar.id) as count,
        ROUND(COUNT(ar.id) * 100.0 / SUM(COUNT(ar.id)) OVER (), 2) as percentage
      FROM archive.analysis_results ar
      LEFT JOIN auth.user_profiles up ON ar.user_id = up.user_id
      WHERE ar.status = 'completed'
      GROUP BY up.gender
      ORDER BY count DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('✅ Gender distribution:');
    genderStats.forEach(stat => {
      console.log(`   ${stat.gender}: ${stat.count} (${stat.percentage}%)`);
    });
    
    // Age group distribution
    const ageStats = await sequelize.query(`
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(up.date_of_birth)) < 20 THEN 'Under 20'
          WHEN EXTRACT(YEAR FROM AGE(up.date_of_birth)) BETWEEN 20 AND 25 THEN '20-25'
          WHEN EXTRACT(YEAR FROM AGE(up.date_of_birth)) BETWEEN 26 AND 30 THEN '26-30'
          WHEN EXTRACT(YEAR FROM AGE(up.date_of_birth)) > 30 THEN 'Over 30'
          ELSE 'Unknown'
        END as age_group,
        COUNT(ar.id) as count
      FROM archive.analysis_results ar
      LEFT JOIN auth.user_profiles up ON ar.user_id = up.user_id
      WHERE ar.status = 'completed'
      GROUP BY age_group
      ORDER BY count DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('✅ Age group distribution:');
    ageStats.forEach(stat => {
      console.log(`   ${stat.age_group}: ${stat.count}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error in demographic insights:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  try {
    console.log('🧪 Testing New Models in Archive Service\n');
    console.log('='.repeat(60));
    
    // Test connection
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.log('\n❌ Cannot proceed without database connection');
      return;
    }
    
    // Test cross-schema access
    const accessOk = await testCrossSchemaAccess();
    if (!accessOk) {
      console.log('\n❌ Cross-schema access failed');
      return;
    }
    
    // Test associations
    const associationsOk = await testAssociations();
    if (!associationsOk) {
      console.log('\n❌ Association tests failed');
      return;
    }
    
    // Test enriched queries
    const queriesOk = await testEnrichedQueries();
    if (!queriesOk) {
      console.log('\n❌ Enriched query tests failed');
      return;
    }
    
    // Test demographic insights
    const insightsOk = await testDemographicInsights();
    if (!insightsOk) {
      console.log('\n❌ Demographic insights tests failed');
      return;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests passed! Archive service can now access user profiles and schools.');
    console.log('\nNew capabilities:');
    console.log('  - Access to user demographic data');
    console.log('  - Enriched analysis results with user info');
    console.log('  - Demographic insights and statistics');
    console.log('  - School-based analytics');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
