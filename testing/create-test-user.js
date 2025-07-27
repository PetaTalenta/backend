#!/usr/bin/env node

/**
 * Create test user with known password and large token balance
 */

const bcrypt = require('bcrypt');

async function createTestUser() {
  const password = 'testpassword123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL to create test user:');
  console.log(`
INSERT INTO auth.users (
  id, 
  email, 
  username, 
  password_hash, 
  user_type, 
  is_active, 
  token_balance,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'testlogin@example.com',
  'testlogin',
  '${hash}',
  'user',
  true,
  5000,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  token_balance = EXCLUDED.token_balance,
  updated_at = NOW();
  `);
}

createTestUser().catch(console.error);
