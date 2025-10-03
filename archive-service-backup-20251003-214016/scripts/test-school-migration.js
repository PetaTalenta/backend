/**
 * Test script to verify school_origin to school_id migration
 * This script tests the updated models and queries
 */

const { sequelize } = require('../src/config/database');
const { UserProfile, School } = require('../src/models');
const demographicService = require('../src/services/demographicService');
const logger = require('../src/utils/logger');

async function testSchoolMigration() {
  try {
    console.log('🔍 Testing school migration from school_origin to school_id...\n');

    // Test 1: Check database schema
    console.log('1. Checking database schema...');
    const userProfileColumns = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'auth' 
        AND table_name = 'user_profiles' 
        AND column_name IN ('school_id', 'school_origin')
      ORDER BY column_name;
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('   User profile columns:', userProfileColumns);

    const schoolsTable = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'schools'
      ORDER BY column_name;
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('   Schools table columns:', schoolsTable.length > 0 ? 'EXISTS' : 'NOT FOUND');

    // Test 2: Check foreign key constraint
    console.log('\n2. Checking foreign key constraints...');
    const foreignKeys = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'auth'
        AND tc.table_name = 'user_profiles'
        AND kcu.column_name = 'school_id';
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('   Foreign key constraints:', foreignKeys);

    // Test 3: Test model associations
    console.log('\n3. Testing model associations...');
    try {
      // Test UserProfile model
      const userProfileModel = UserProfile.rawAttributes;
      console.log('   UserProfile.school_id field:', userProfileModel.school_id ? 'EXISTS' : 'NOT FOUND');
      console.log('   UserProfile.school_origin field:', userProfileModel.school_origin ? 'EXISTS (SHOULD BE REMOVED)' : 'NOT FOUND (CORRECT)');

      // Test School model
      const schoolModel = School.rawAttributes;
      console.log('   School model fields:', Object.keys(schoolModel));

    } catch (error) {
      console.log('   Model test error:', error.message);
    }

    // Test 4: Test demographic service queries
    console.log('\n4. Testing demographic service queries...');
    try {
      // Test basic demographic overview
      const overview = await demographicService.getDemographicOverview();
      console.log('   Demographic overview:', overview ? 'SUCCESS' : 'FAILED');

      // Test school analytics
      const schoolAnalytics = await demographicService.getSchoolAnalytics();
      console.log('   School analytics:', schoolAnalytics ? 'SUCCESS' : 'FAILED');
      console.log('   School stats count:', schoolAnalytics.schoolStats?.length || 0);

    } catch (error) {
      console.log('   Demographic service test error:', error.message);
    }

    // Test 5: Test sample query with JOIN
    console.log('\n5. Testing sample query with schools JOIN...');
    try {
      const sampleQuery = await sequelize.query(`
        SELECT 
          up.user_id,
          up.full_name,
          up.school_id,
          s.name as school_name,
          s.city as school_city,
          s.province as school_province
        FROM auth.user_profiles up
        LEFT JOIN public.schools s ON up.school_id = s.id
        LIMIT 5;
      `, { type: sequelize.QueryTypes.SELECT });

      console.log('   Sample query results:', sampleQuery.length, 'rows');
      if (sampleQuery.length > 0) {
        console.log('   Sample row:', {
          user_id: sampleQuery[0].user_id,
          school_id: sampleQuery[0].school_id,
          school_name: sampleQuery[0].school_name || 'NULL'
        });
      }

    } catch (error) {
      console.log('   Sample query error:', error.message);
    }

    console.log('\n✅ School migration test completed!');
    console.log('\nSummary:');
    console.log('- Database schema should show school_id field (integer) instead of school_origin');
    console.log('- Foreign key constraint should exist between user_profiles.school_id and schools.id');
    console.log('- Models should use school_id associations');
    console.log('- Queries should JOIN with schools table for school information');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run the test
if (require.main === module) {
  testSchoolMigration();
}

module.exports = { testSchoolMigration };
