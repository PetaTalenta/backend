const express = require('express');
const router = express.Router();

const { serviceAuth } = require('../middleware/serviceAuth');
const { validateNotification } = require('../utils/validator');
const socketService = require('../services/socketService');
const logger = require('../utils/logger');

/**
 * POST /notifications/analysis-started
 * Endpoint untuk menerima notifikasi ketika analisis dimulai
 */
router.post('/analysis-started', serviceAuth, validateNotification, (req, res) => {
  try {
    const { userId, jobId, status, message, metadata } = req.body;

    // Send notification to user via WebSocket
    const sent = socketService.sendToUser(userId, 'analysis-started', {
      jobId,
      status,
      message: message || 'Your analysis has started processing...',
      metadata: metadata || {}
    });

    logger.info('Analysis started notification processed', {
      userId,
      jobId,
      sent
    });

    res.json({
      success: true,
      message: 'Notification sent',
      data: {
        userId,
        jobId,
        sent
      }
    });

  } catch (error) {
    logger.error('Error processing analysis started notification', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process notification'
      }
    });
  }
});

/**
 * POST /notifications/analysis-complete
 * Endpoint untuk menerima notifikasi dari analysis-worker ketika analisis selesai
 */
router.post('/analysis-complete', serviceAuth, validateNotification, (req, res) => {
  try {
    const { userId, jobId, resultId, status, message, metadata } = req.body;

    // Send notification to user via WebSocket
    const sent = socketService.sendToUser(userId, 'analysis-complete', {
      jobId,
      resultId,
      status,
      message: message || 'Your analysis is ready!',
      metadata: metadata || {}
    });

    logger.info('Analysis complete notification processed', {
      userId,
      jobId,
      resultId,
      sent
    });

    res.json({
      success: true,
      message: 'Notification sent',
      data: {
        userId,
        jobId,
        resultId,
        sent
      }
    });

  } catch (error) {
    logger.error('Error processing analysis complete notification', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process notification'
      }
    });
  }
});

/**
 * POST /notifications/analysis-failed
 * Endpoint untuk menerima notifikasi ketika analisis gagal
 */
router.post('/analysis-failed', serviceAuth, validateNotification, (req, res) => {
  try {
    const { userId, jobId, error, message, metadata } = req.body;

    // Send notification to user via WebSocket
    const sent = socketService.sendToUser(userId, 'analysis-failed', {
      jobId,
      error,
      message: message || 'Analysis failed. Please try again.',
      metadata: metadata || {}
    });

    logger.info('Analysis failed notification processed', {
      userId,
      jobId,
      error,
      sent
    });

    res.json({
      success: true,
      message: 'Notification sent',
      data: {
        userId,
        jobId,
        error,
        sent
      }
    });

  } catch (error) {
    logger.error('Error processing analysis failed notification', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process notification'
      }
    });
  }
});

/**
 * GET /notifications/status
 * Endpoint untuk memeriksa status service dan koneksi
 */
router.get('/status', serviceAuth, (req, res) => {
  try {
    const connections = socketService.getConnectionCount();
    
    res.json({
      success: true,
      service: 'notification-service',
      status: 'operational',
      connections,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting service status', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get service status'
      }
    });
  }
});

module.exports = router;
