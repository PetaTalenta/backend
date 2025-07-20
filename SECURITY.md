# Security Guide - ATMA Backend

Panduan keamanan untuk ATMA Backend microservices architecture.

## 🛡️ Status Keamanan Saat Ini

**✅ SEMUA SERVICE AMAN** - Tidak ada vulnerabilities yang ditemukan pada audit terakhir.

### Audit Terakhir
- **Tanggal**: 15 Juli 2025
- **Total Services**: 6
- **Services Aman**: 6 ✅
- **Services Vulnerable**: 0 ❌
- **Total Vulnerabilities**: 0

## 🔍 Audit Keamanan

### Menjalankan Audit Keamanan

```bash
# Audit semua services sekaligus
npm run security:audit

# Audit individual service
cd <service-name>
npm audit
```

### Memperbaiki Vulnerabilities

```bash
# Perbaiki semua services sekaligus
npm run security:fix

# Perbaiki individual service
cd <service-name>
npm audit fix

# Jika diperlukan force fix (hati-hati!)
npm audit fix --force
```

## 🔒 Fitur Keamanan yang Diimplementasikan

### 1. Authentication & Authorization
- **JWT Tokens**: Semua user endpoints menggunakan JWT authentication
- **Service Keys**: Internal service communication menggunakan service keys
- **Token Balance**: User memiliki token balance untuk mencegah abuse
- **User Isolation**: User hanya dapat mengakses data miliknya sendiri

### 2. Input Validation
- **Joi Validation**: Semua input divalidasi menggunakan Joi schemas
- **Type Safety**: Strict type checking untuk semua data
- **Sanitization**: Input disanitasi untuk mencegah injection attacks

### 3. Database Security
- **Sequelize ORM**: Mencegah SQL injection attacks
- **Schema Isolation**: Setiap service menggunakan schema terpisah
- **Prepared Statements**: Semua query menggunakan prepared statements
- **Connection Pooling**: Secure database connection management

### 4. Network Security
- **CORS Configuration**: Proper CORS setup untuk cross-origin requests
- **Rate Limiting**: Rate limiting pada API Gateway
- **Request Logging**: Comprehensive request logging untuk monitoring
- **Error Handling**: Secure error handling tanpa expose sensitive data

### 5. Service Communication
- **Internal Service Auth**: Service-to-service authentication
- **Header Validation**: Validasi headers untuk internal requests
- **Timeout Management**: Proper timeout untuk mencegah hanging requests

## 📋 Security Checklist

### Development
- [ ] Semua dependencies up-to-date
- [ ] No high/critical vulnerabilities
- [ ] Input validation implemented
- [ ] Authentication required untuk semua endpoints
- [ ] Error handling tidak expose sensitive data
- [ ] Logging tidak include sensitive data

### Production
- [ ] Environment variables properly configured
- [ ] Database credentials secure
- [ ] JWT secrets strong dan unique
- [ ] Service keys strong dan unique
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Monitoring dan alerting setup

## 🚨 Vulnerability Response

### Jika Ditemukan Vulnerability:

1. **Immediate Assessment**
   ```bash
   npm run security:audit
   ```

2. **Categorize Severity**
   - **Critical**: Immediate action required
   - **High**: Fix within 24 hours
   - **Moderate**: Fix within 1 week
   - **Low**: Fix dalam next release

3. **Fix Process**
   ```bash
   # Try automatic fix first
   npm audit fix
   
   # If automatic fix fails
   npm audit fix --force
   
   # Test thoroughly after fix
   npm test
   npm run test:integration
   ```

4. **Verification**
   ```bash
   # Verify fix worked
   npm audit
   
   # Test all functionality
   npm run test:all
   ```

## 🔧 Security Tools

### Automated Security Audit Script
Script `security-audit.js` melakukan:
- Audit semua 6 microservices
- Generate comprehensive report
- Provide fix recommendations
- Save detailed JSON report

### Manual Security Checks
```bash
# Check for outdated packages
npm outdated

# Check for security advisories
npm audit

# Check for unused dependencies
npm-check-unused

# Check for license issues
license-checker
```

## 📊 Security Monitoring

### Metrics to Monitor
- Failed authentication attempts
- Unusual API usage patterns
- Database connection errors
- Service communication failures
- Rate limit violations

### Log Analysis
- Monitor error logs untuk security events
- Track user access patterns
- Monitor service-to-service communication
- Alert pada suspicious activities

## 🔄 Regular Security Maintenance

### Weekly
- [ ] Run security audit
- [ ] Check for dependency updates
- [ ] Review error logs
- [ ] Monitor rate limiting metrics

### Monthly
- [ ] Update dependencies
- [ ] Review access logs
- [ ] Update security documentation
- [ ] Security training review

### Quarterly
- [ ] Full security assessment
- [ ] Penetration testing
- [ ] Security policy review
- [ ] Incident response drill

## 📞 Security Contacts

### Reporting Security Issues
- **Email**: security@atma.com
- **Priority**: High/Critical issues within 24 hours
- **Process**: Create detailed report dengan steps to reproduce

### Security Team
- **Lead**: Security Engineer
- **DevOps**: Infrastructure Security
- **Backend**: Application Security

## 📚 Security Resources

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)

### Tools
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)

---

**Last Updated**: 15 Juli 2025  
**Next Review**: 15 Agustus 2025
