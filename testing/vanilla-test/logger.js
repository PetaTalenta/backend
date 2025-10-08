import colors from 'colors';

class Logger {
  constructor() {
    this.startTime = Date.now();
    this.phaseStartTime = null;
  }

  startPhase(phaseNumber, phaseName) {
    this.phaseStartTime = Date.now();
    console.log('\n' + '='.repeat(80).cyan);
    console.log(`Phase ${phaseNumber}: ${phaseName}`.cyan.bold);
    console.log('='.repeat(80).cyan);
  }

  endPhase(success = true) {
    const duration = Date.now() - this.phaseStartTime;
    const status = success ? '✓ PASSED'.green.bold : '✗ FAILED'.red.bold;
    console.log(`${status} (${duration}ms)`.gray);
  }

  success(message) {
    console.log('✓'.green + ' ' + message.green);
  }

  error(message, error = null) {
    console.log('✗'.red + ' ' + message.red);
    if (error) {
      console.log('  Error:'.red, error.message || error);
      if (error.response?.data) {
        console.log('  Response:'.red, JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  warning(message) {
    console.log('⚠'.yellow + ' ' + message.yellow);
  }

  info(message) {
    console.log('ℹ'.blue + ' ' + message.blue);
  }

  data(label, value) {
    console.log(`  ${label}:`.gray, typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
  }

  section(title) {
    console.log('\n' + title.cyan.underline);
  }

  summary(results) {
    console.log('\n' + '='.repeat(80).magenta);
    console.log('TEST SUMMARY'.magenta.bold);
    console.log('='.repeat(80).magenta);
    
    const totalDuration = Date.now() - this.startTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;
    
    console.log(`\nTotal Phases: ${total}`);
    console.log(`Passed: ${passed}`.green);
    console.log(`Failed: ${failed}`.red);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    console.log('\nPhase Results:'.cyan);
    results.forEach((result, index) => {
      const status = result.success ? '✓'.green : '✗'.red;
      const duration = result.duration ? `(${result.duration}ms)` : '';
      console.log(`  ${status} Phase ${index + 1}: ${result.name} ${duration}`.gray);
      if (!result.success && result.error) {
        console.log(`    Error: ${result.error}`.red);
      }
    });
    
    console.log('\n' + '='.repeat(80).magenta);
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! 🎉'.green.bold);
    } else {
      console.log(`⚠️  ${failed} TEST(S) FAILED`.red.bold);
    }
    console.log('='.repeat(80).magenta + '\n');
  }

  json(data) {
    console.log(JSON.stringify(data, null, 2).gray);
  }
}

export default new Logger();

