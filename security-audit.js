/**
 * Security Audit Script for All ATMA Services
 * Checks npm audit for all microservices and generates security report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// List of services to audit
const services = [
  'api-gateway',
  'auth-service', 
  'archive-service',
  'assessment-service',
  'analysis-worker',
  'notification-service'
];

/**
 * Run npm audit for a service
 */
function auditService(serviceName) {
  const servicePath = path.join(__dirname, serviceName);
  
  if (!fs.existsSync(servicePath)) {
    return {
      service: serviceName,
      status: 'not_found',
      message: 'Service directory not found'
    };
  }
  
  if (!fs.existsSync(path.join(servicePath, 'package.json'))) {
    return {
      service: serviceName,
      status: 'no_package_json', 
      message: 'No package.json found'
    };
  }
  
  try {
    console.log(`🔍 Auditing ${serviceName}...`);
    
    // Run npm audit
    execSync('npm audit', {
      cwd: servicePath,
      encoding: 'utf8',
      timeout: 30000,
      stdio: 'pipe'
    });
    
    return {
      service: serviceName,
      status: 'success',
      vulnerabilities: 0,
      message: 'No vulnerabilities found'
    };
    
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities are found
    const output = error.stdout || error.stderr || '';
    
    if (output.includes('found 0 vulnerabilities')) {
      return {
        service: serviceName,
        status: 'success',
        vulnerabilities: 0,
        message: 'No vulnerabilities found'
      };
    }
    
    // Parse vulnerability count from output
    const vulnMatch = output.match(/(\d+)\s+(high|moderate|low|critical|info)\s+severity\s+vulnerabilit/gi);
    let totalVulns = 0;
    const severityCount = {};
    
    if (vulnMatch) {
      vulnMatch.forEach(match => {
        const parts = match.match(/(\d+)\s+(\w+)/);
        if (parts) {
          const count = parseInt(parts[1]);
          const severity = parts[2].toLowerCase();
          severityCount[severity] = (severityCount[severity] || 0) + count;
          totalVulns += count;
        }
      });
    } else {
      // Try to extract total number
      const totalMatch = output.match(/found\s+(\d+)\s+vulnerabilities/i);
      if (totalMatch) {
        totalVulns = parseInt(totalMatch[1]);
      }
    }
    
    return {
      service: serviceName,
      status: totalVulns > 0 ? 'vulnerabilities_found' : 'success',
      vulnerabilities: totalVulns,
      severityBreakdown: severityCount,
      output: output.substring(0, 500) // Limit output length
    };
  }
}

/**
 * Generate security report
 */
function generateReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('🛡️  ATMA Security Audit Report');
  console.log('='.repeat(60));
  
  let totalServices = 0;
  let secureServices = 0;
  let vulnerableServices = 0;
  let totalVulnerabilities = 0;
  
  results.forEach(result => {
    totalServices++;
    
    console.log(`\n📦 ${result.service.toUpperCase()}`);
    
    switch (result.status) {
      case 'success':
        console.log('✅ No vulnerabilities found');
        secureServices++;
        break;
        
      case 'vulnerabilities_found':
        vulnerableServices++;
        totalVulnerabilities += result.vulnerabilities;
        
        console.log(`❌ ${result.vulnerabilities} vulnerabilities found`);
        
        if (result.severityBreakdown) {
          Object.entries(result.severityBreakdown).forEach(([severity, count]) => {
            const emoji = {
              critical: '🔴',
              high: '🟠', 
              moderate: '🟡',
              low: '🔵',
              info: '⚪'
            }[severity] || '⚫';
            console.log(`   ${emoji} ${severity}: ${count}`);
          });
        }
        break;
        
      case 'not_found':
        console.log('⚠️  Service directory not found');
        break;
        
      case 'no_package_json':
        console.log('⚠️  No package.json found');
        break;
        
      case 'error':
        console.log(`❌ Error: ${result.message}`);
        break;
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Services: ${totalServices}`);
  console.log(`Secure Services: ${secureServices} ✅`);
  console.log(`Vulnerable Services: ${vulnerableServices} ❌`);
  console.log(`Total Vulnerabilities: ${totalVulnerabilities}`);
  
  // Recommendations
  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  if (totalVulnerabilities === 0) {
    console.log('🎉 All services are secure! No action needed.');
  } else {
    console.log('To fix vulnerabilities:');
    
    results.forEach(result => {
      if (result.status === 'vulnerabilities_found') {
        console.log(`\n${result.service}:`);
        console.log(`  cd ${result.service}`);
        console.log(`  npm audit fix`);
        
        if (result.severityBreakdown?.critical > 0 || result.severityBreakdown?.high > 0) {
          console.log(`  # If automatic fix doesn't work:`);
          console.log(`  npm audit fix --force`);
          console.log(`  # ⚠️  Test thoroughly after force fix`);
        }
      }
    });
    
    console.log('\n⚠️  Always test your application after fixing vulnerabilities!');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return {
    totalServices,
    secureServices,
    vulnerableServices,
    totalVulnerabilities
  };
}

/**
 * Main audit function
 */
async function runSecurityAudit() {
  console.log('🛡️  Starting ATMA Security Audit...\n');
  
  const results = [];
  
  for (const service of services) {
    const result = auditService(service);
    results.push(result);
  }
  
  const summary = generateReport(results);
  
  // Save report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary,
    results
  };
  
  const reportPath = path.join(__dirname, 'security-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  return summary;
}

// Run audit if this script is executed directly
if (require.main === module) {
  runSecurityAudit().catch(error => {
    console.error('💥 Security audit failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runSecurityAudit,
  auditService,
  generateReport
};
