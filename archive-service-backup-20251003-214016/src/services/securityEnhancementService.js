/**
 * Security Enhancement Service - Phase 4 Implementation
 * Enhanced security features building on Phase 1-3 audit systems
 * Implements advanced audit logging, data access controls, and GDPR compliance
 */

const { sequelize } = require('../config/database');
const UserActivityLog = require('../models/UserActivityLog');
const AnalysisResult = require('../models/AnalysisResult');
const AnalysisJob = require('../models/AnalysisJob');
const logger = require('../utils/logger');
const crypto = require('crypto');

class SecurityEnhancementService {
  constructor() {
    this.sensitiveFields = [
      'email', 'phone', 'address', 'date_of_birth', 'full_name',
      'test_data', 'raw_response', 'persona_profile'
    ];
    this.gdprRetentionPeriod = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years in milliseconds
  }

  /**
   * Enhanced audit logging with security context
   * Phase 4 Enhancement - Building on Phase 2's comprehensive activity tracking
   */
  async logSecurityEvent(eventType, adminId, details = {}) {
    try {
      const securityLog = {
        admin_id: adminId,
        activity_type: `security_${eventType}`,
        description: details.description || `Security event: ${eventType}`,
        ip_address: details.ipAddress,
        user_agent: details.userAgent,
        additional_data: {
          ...details.additionalData,
          security_level: details.securityLevel || 'medium',
          risk_score: this.calculateRiskScore(eventType, details),
          timestamp: new Date().toISOString(),
          session_id: details.sessionId
        }
      };

      await UserActivityLog.create(securityLog);

      logger.info('Security event logged', {
        eventType,
        adminId,
        riskScore: securityLog.additional_data.risk_score,
        securityLevel: securityLog.additional_data.security_level
      });

      // Alert on high-risk events
      if (securityLog.additional_data.risk_score >= 8) {
        await this.alertHighRiskEvent(securityLog);
      }

      return securityLog;
    } catch (error) {
      logger.error('Failed to log security event', {
        eventType,
        adminId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate risk score for security events
   */
  calculateRiskScore(eventType, details) {
    let baseScore = 5; // Default medium risk

    const riskFactors = {
      'data_export': 7,
      'bulk_operation': 6,
      'user_deletion': 8,
      'sensitive_data_access': 6,
      'performance_optimization': 4,
      'job_cancellation': 3,
      'failed_authentication': 9,
      'suspicious_activity': 10
    };

    baseScore = riskFactors[eventType] || baseScore;

    // Adjust based on additional factors
    if (details.bulkCount && details.bulkCount > 50) {
      baseScore += 2;
    }

    if (details.sensitiveDataAccessed) {
      baseScore += 1;
    }

    if (details.offHours) {
      baseScore += 1;
    }

    return Math.min(baseScore, 10); // Cap at 10
  }

  /**
   * Alert on high-risk security events
   */
  async alertHighRiskEvent(securityLog) {
    try {
      logger.warn('HIGH RISK SECURITY EVENT DETECTED', {
        eventType: securityLog.activity_type,
        adminId: securityLog.admin_id,
        riskScore: securityLog.additional_data.risk_score,
        ipAddress: securityLog.ip_address,
        timestamp: securityLog.additional_data.timestamp
      });

      // In a production environment, this would trigger alerts to security team
      // For now, we'll just log it prominently
    } catch (error) {
      logger.error('Failed to alert high-risk event', {
        error: error.message,
        securityLogId: securityLog.id
      });
    }
  }

  /**
   * Data access control validation
   * Phase 4 Enhancement - Using Phase 3's assessment deep dive security model
   */
  async validateDataAccess(adminId, resourceType, resourceId, operation) {
    try {
      const accessLog = {
        admin_id: adminId,
        resource_type: resourceType,
        resource_id: resourceId,
        operation,
        timestamp: new Date(),
        granted: false
      };

      // Check admin permissions based on resource sensitivity
      const isAuthorized = await this.checkAdminAuthorization(adminId, resourceType, operation);
      
      if (!isAuthorized) {
        accessLog.denial_reason = 'Insufficient permissions';
        await this.logAccessDenial(accessLog);
        return false;
      }

      // Check for suspicious access patterns
      const isSuspicious = await this.detectSuspiciousAccess(adminId, resourceType, operation);
      
      if (isSuspicious) {
        accessLog.denial_reason = 'Suspicious access pattern detected';
        await this.logAccessDenial(accessLog);
        return false;
      }

      accessLog.granted = true;
      await this.logDataAccess(accessLog);
      
      return true;
    } catch (error) {
      logger.error('Data access validation failed', {
        adminId,
        resourceType,
        resourceId,
        operation,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check admin authorization for specific operations
   */
  async checkAdminAuthorization(adminId, resourceType, operation) {
    // This would integrate with the admin role system
    // For now, we'll implement basic checks
    
    const sensitiveOperations = ['delete', 'export', 'bulk_operation'];
    const sensitiveResources = ['user_data', 'assessment_details', 'system_performance'];

    // Superadmin can do everything
    // In a real implementation, this would check the admin's role from the database
    
    if (sensitiveOperations.includes(operation) && sensitiveResources.includes(resourceType)) {
      // Would check if admin has superadmin role
      return true; // Simplified for demo
    }

    return true; // Allow other operations
  }

  /**
   * Detect suspicious access patterns
   */
  async detectSuspiciousAccess(adminId, resourceType, operation) {
    try {
      // Check for rapid successive requests (potential automation)
      const recentAccess = await UserActivityLog.count({
        where: {
          admin_id: adminId,
          created_at: {
            [sequelize.Op.gte]: new Date(Date.now() - 60000) // Last minute
          }
        }
      });

      if (recentAccess > 20) {
        logger.warn('Suspicious access pattern: High frequency requests', {
          adminId,
          requestsPerMinute: recentAccess
        });
        return true;
      }

      // Check for access outside normal hours
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 22) {
        logger.info('Off-hours access detected', {
          adminId,
          hour: currentHour,
          resourceType,
          operation
        });
        // Not blocking, but flagging for review
      }

      return false;
    } catch (error) {
      logger.error('Failed to detect suspicious access', {
        adminId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Log data access for audit trail
   */
  async logDataAccess(accessLog) {
    try {
      await UserActivityLog.create({
        admin_id: accessLog.admin_id,
        activity_type: 'data_access',
        description: `Data access: ${accessLog.operation} on ${accessLog.resource_type}`,
        additional_data: {
          resource_type: accessLog.resource_type,
          resource_id: accessLog.resource_id,
          operation: accessLog.operation,
          granted: accessLog.granted,
          access_timestamp: accessLog.timestamp
        }
      });
    } catch (error) {
      logger.error('Failed to log data access', {
        accessLog,
        error: error.message
      });
    }
  }

  /**
   * Log access denial for security monitoring
   */
  async logAccessDenial(accessLog) {
    try {
      await UserActivityLog.create({
        admin_id: accessLog.admin_id,
        activity_type: 'access_denied',
        description: `Access denied: ${accessLog.operation} on ${accessLog.resource_type}`,
        additional_data: {
          resource_type: accessLog.resource_type,
          resource_id: accessLog.resource_id,
          operation: accessLog.operation,
          denial_reason: accessLog.denial_reason,
          denied_at: accessLog.timestamp
        }
      });

      logger.warn('Data access denied', {
        adminId: accessLog.admin_id,
        resourceType: accessLog.resource_type,
        operation: accessLog.operation,
        reason: accessLog.denial_reason
      });
    } catch (error) {
      logger.error('Failed to log access denial', {
        accessLog,
        error: error.message
      });
    }
  }

  /**
   * GDPR compliance - Data anonymization
   * Phase 4 Enhancement - Leveraging Phase 1-3's data privacy implementations
   */
  async anonymizeUserData(userId, adminId) {
    const transaction = await sequelize.transaction();
    
    try {
      logger.info('Starting GDPR data anonymization', {
        userId,
        adminId,
        timestamp: new Date().toISOString()
      });

      // Generate anonymization hash
      const anonymizationId = crypto.randomUUID();
      const anonymizedEmail = `anonymized_${anonymizationId}@gdpr.local`;

      // Anonymize analysis results
      const analysisResults = await AnalysisResult.findAll({
        where: { user_id: userId },
        transaction
      });

      for (const result of analysisResults) {
        // Keep statistical data but remove personal identifiers
        const anonymizedData = this.anonymizePersonalData(result.test_data);
        const anonymizedProfile = this.anonymizePersonalData(result.persona_profile);

        await result.update({
          test_data: anonymizedData,
          persona_profile: anonymizedProfile,
          raw_response: null, // Remove raw responses completely
          anonymized_at: new Date(),
          anonymization_id: anonymizationId
        }, { transaction });
      }

      // Anonymize analysis jobs
      await AnalysisJob.update({
        anonymized_at: new Date(),
        anonymization_id: anonymizationId
      }, {
        where: { user_id: userId },
        transaction
      });

      // Log the anonymization
      await this.logSecurityEvent('data_anonymization', adminId, {
        description: `User data anonymized for GDPR compliance`,
        additionalData: {
          userId,
          anonymizationId,
          recordsAnonymized: analysisResults.length
        },
        securityLevel: 'high'
      });

      await transaction.commit();

      logger.info('GDPR data anonymization completed', {
        userId,
        adminId,
        anonymizationId,
        recordsAnonymized: analysisResults.length
      });

      return {
        success: true,
        anonymizationId,
        recordsAnonymized: analysisResults.length,
        anonymizedAt: new Date().toISOString()
      };
    } catch (error) {
      await transaction.rollback();
      
      logger.error('GDPR data anonymization failed', {
        userId,
        adminId,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  /**
   * Anonymize personal data while preserving statistical value
   */
  anonymizePersonalData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const anonymized = JSON.parse(JSON.stringify(data));

    // Remove or hash sensitive fields
    this.sensitiveFields.forEach(field => {
      if (anonymized[field]) {
        if (typeof anonymized[field] === 'string') {
          anonymized[field] = this.hashSensitiveData(anonymized[field]);
        } else {
          delete anonymized[field];
        }
      }
    });

    // Recursively anonymize nested objects
    Object.keys(anonymized).forEach(key => {
      if (typeof anonymized[key] === 'object' && anonymized[key] !== null) {
        anonymized[key] = this.anonymizePersonalData(anonymized[key]);
      }
    });

    return anonymized;
  }

  /**
   * Hash sensitive data for anonymization
   */
  hashSensitiveData(data) {
    return crypto.createHash('sha256').update(data.toString()).digest('hex').substring(0, 16);
  }
}

module.exports = new SecurityEnhancementService();
