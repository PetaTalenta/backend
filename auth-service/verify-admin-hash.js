#!/usr/bin/env node

/**
 * Script to verify the admin password hash
 */

const bcrypt = require('bcrypt');

// The hash we generated and used in the database
const adminHash = '$2b$10$tZpv7FVculrmTvYWclaFVOUJUkZZEuULa5xATIeXmQhtS7g94dPHG';

// Test passwords
const testPasswords = [
  'admin123',
  'admin',
  'password',
  'Admin123',
  'ADMIN123',
  'admin1234',
  'admin12'
];

console.log('Testing passwords against admin hash:');
console.log('Hash:', adminHash);
console.log('='.repeat(60));

testPasswords.forEach(password => {
  const isMatch = bcrypt.compareSync(password, adminHash);
  console.log(`Password: "${password}" - ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
});

// Specific test for admin123
console.log('\n' + '='.repeat(60));
console.log('SPECIFIC TEST FOR "admin123":');
const isAdmin123Match = bcrypt.compareSync('admin123', adminHash);
console.log(`Password "admin123" matches hash: ${isAdmin123Match ? '✅ YES' : '❌ NO'}`);

// Generate a fresh hash for comparison
console.log('\n' + '='.repeat(60));
console.log('Generating fresh hash for "admin123" for comparison:');
const freshHash = bcrypt.hashSync('admin123', 10);
console.log('Fresh hash:', freshHash);
console.log('Fresh hash verification:', bcrypt.compareSync('admin123', freshHash) ? '✅ VALID' : '❌ INVALID');
