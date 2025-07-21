'use strict';

/**
 * Migration: Add Performance Indexes
 * Phase 3: Database Optimization
 * 
 * Adds indexes untuk meningkatkan query performance pada analysis_results table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Adding performance indexes to analysis_results table...');
    
    try {
      // Index untuk query berdasarkan user_id dan created_at
      await queryInterface.addIndex('analysis_results', 
        ['user_id', 'created_at'], 
        {
          name: 'idx_analysis_results_user_created',
          concurrently: true,
          schema: 'archive'
        }
      );
      console.log('✓ Created index: idx_analysis_results_user_created');

      // Index untuk status queries
      await queryInterface.addIndex('analysis_results', 
        ['status', 'created_at'], 
        {
          name: 'idx_analysis_results_status_created',
          concurrently: true,
          schema: 'archive'
        }
      );
      console.log('✓ Created index: idx_analysis_results_status_created');

      // Index untuk assessment_name queries (untuk faster lookups by assessment type)
      await queryInterface.addIndex('analysis_results',
        ['assessment_name'],
        {
          name: 'idx_analysis_results_assessment_name_optimized',
          concurrently: true,
          schema: 'archive'
        }
      );
      console.log('✓ Created index: idx_analysis_results_assessment_name_optimized');

      // Composite index untuk complex queries
      await queryInterface.addIndex('analysis_results', 
        ['user_id', 'status', 'created_at'], 
        {
          name: 'idx_analysis_results_user_status_created',
          concurrently: true,
          schema: 'archive'
        }
      );
      console.log('✓ Created index: idx_analysis_results_user_status_created');

      console.log('All performance indexes created successfully!');
    } catch (error) {
      console.error('Error creating indexes:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Removing performance indexes from analysis_results table...');
    
    try {
      await queryInterface.removeIndex('analysis_results', 'idx_analysis_results_user_created');
      console.log('✓ Removed index: idx_analysis_results_user_created');
      
      await queryInterface.removeIndex('analysis_results', 'idx_analysis_results_status_created');
      console.log('✓ Removed index: idx_analysis_results_status_created');
      
      await queryInterface.removeIndex('analysis_results', 'idx_analysis_results_assessment_name_optimized');
      console.log('✓ Removed index: idx_analysis_results_assessment_name_optimized');
      
      await queryInterface.removeIndex('analysis_results', 'idx_analysis_results_user_status_created');
      console.log('✓ Removed index: idx_analysis_results_user_status_created');

      console.log('All performance indexes removed successfully!');
    } catch (error) {
      console.error('Error removing indexes:', error.message);
      throw error;
    }
  }
};
