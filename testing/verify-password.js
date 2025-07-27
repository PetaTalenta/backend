#!/usr/bin/env node

/**
 * Password verification script to test bcrypt hashes
 */

const bcrypt = require('bcrypt');

const hash = '$2b$10$CmVLZQnGHBSXHk7qbHtwgOfx4qkxlldARe2vAcfI6fNZ/b5NRDn8e';
const testPasswords = [
  'testpassword123',
  'password123',
  'admin123',
  'test123',
  'secret',
  'password',
  'admin',
  'test',
  'TestPassword123!',
  'AdminPassword123!'
];

console.log('Testing passwords against hash:', hash);
console.log('='.repeat(50));

testPasswords.forEach(password => {
  const isMatch = bcrypt.compareSync(password, hash);
  console.log(`Password: "${password}" - ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
});

// Also generate a new hash for testpassword123 to compare
console.log('\n' + '='.repeat(50));
console.log('Generating new hash for "testpassword123":');
const newHash = bcrypt.hashSync('testpassword123', 10);
console.log('New hash:', newHash);
console.log('Verification:', bcrypt.compareSync('testpassword123', newHash) ? '✅ VALID' : '❌ INVALID');
