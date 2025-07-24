/**
 * Admin Cleanup Routes
 * Endpoints for cleaning up test data and managing system maintenance
 */

const express = require('express');
const router = express.Router();
const { User } = require('../../models');
const logger = require('../../utils/logger');
const { authenticateToken, requireAdminRole } = require('../../middleware/auth');
const { Op } = require('sequelize');

/**
 * @route DELETE /admin/cleanup/test-users
 * @description Clean up test users and related data
 * @access Admin only
 */
router.delete('/test-users', authenticateToken, requireAdminRole('admin'), async (req, res) => {
  try {
    const { 
      olderThanHours = 24, 
      batchSize = 100,
      dryRun = false 
    } = req.query;

    logger.info('Starting test user cleanup', {
      olderThanHours,
      batchSize,
      dryRun: dryRun === 'true',
      adminUser: req.user.id
    });

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - parseInt(olderThanHours));

    // Find test users (emails containing testuser and example.com)
    const testUserConditions = {
      [Op.and]: [
        {
          email: {
            [Op.like]: '%testuser%@example.com'
          }
        },
        {
          created_at: {
            [Op.lt]: cutoffDate
          }
        }
      ]
    };

    if (dryRun === 'true') {
      // Dry run - just count what would be deleted
      const count = await User.count({
        where: testUserConditions
      });

      return res.json({
        success: true,
        dryRun: true,
        message: `Would delete ${count} test users`,
        count,
        cutoffDate,
        criteria: {
          emailPattern: '%testuser%@example.com',
          olderThanHours: parseInt(olderThanHours)
        }
      });
    }

    // Actual deletion
    const deletedUsers = await User.destroy({
      where: testUserConditions,
      limit: parseInt(batchSize)
    });

    logger.info('Test user cleanup completed', {
      deletedCount: deletedUsers,
      cutoffDate,
      adminUser: req.user.id
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deletedUsers} test users`,
      deletedCount: deletedUsers,
      cutoffDate,
      criteria: {
        emailPattern: '%testuser%@example.com',
        olderThanHours: parseInt(olderThanHours),
        batchSize: parseInt(batchSize)
      }
    });

  } catch (error) {
    logger.error('Test user cleanup failed', {
      error: error.message,
      stack: error.stack,
      adminUser: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to cleanup test users',
      error: error.message
    });
  }
});

/**
 * @route GET /admin/cleanup/test-users/count
 * @description Count test users that would be cleaned up
 * @access Admin only
 */
router.get('/test-users/count', authenticateToken, requireAdminRole('admin'), async (req, res) => {
  try {
    const { olderThanHours = 24 } = req.query;

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - parseInt(olderThanHours));

    const count = await User.count({
      where: {
        [Op.and]: [
          {
            email: {
              [Op.like]: '%testuser%@example.com'
            }
          },
          {
            created_at: {
              [Op.lt]: cutoffDate
            }
          }
        ]
      }
    });

    res.json({
      success: true,
      count,
      cutoffDate,
      criteria: {
        emailPattern: '%testuser%@example.com',
        olderThanHours: parseInt(olderThanHours)
      }
    });

  } catch (error) {
    logger.error('Failed to count test users', {
      error: error.message,
      adminUser: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to count test users',
      error: error.message
    });
  }
});

/**
 * @route POST /admin/cleanup/schedule
 * @description Schedule automatic cleanup (placeholder for future implementation)
 * @access Admin only
 */
router.post('/schedule', authenticateToken, requireAdminRole('admin'), async (req, res) => {
  try {
    const { 
      enabled = true,
      intervalHours = 24,
      olderThanHours = 48,
      batchSize = 100
    } = req.body;

    // This is a placeholder for future cron job implementation
    logger.info('Cleanup schedule configuration updated', {
      enabled,
      intervalHours,
      olderThanHours,
      batchSize,
      adminUser: req.user.id
    });

    res.json({
      success: true,
      message: 'Cleanup schedule configured (implementation pending)',
      configuration: {
        enabled,
        intervalHours,
        olderThanHours,
        batchSize
      },
      note: 'Automatic cleanup scheduling will be implemented in future version'
    });

  } catch (error) {
    logger.error('Failed to configure cleanup schedule', {
      error: error.message,
      adminUser: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to configure cleanup schedule',
      error: error.message
    });
  }
});

module.exports = router;
