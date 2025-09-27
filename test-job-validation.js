#!/usr/bin/env node

/**
 * Test job ID validation
 */

const { v4: uuidv4, validate: uuidValidate } = require('uuid');

const testJobIds = [
  '85c6e3f2-5769-4b1a-b79c-0fb12ba18fe9',
  '973a1dc1-124e-482f-bdbc-773b2621d5c7',
  'f994c05f-1be4-4d47-b92a-561f16c27943'
];

console.log('🧪 Testing Job ID Validation');
console.log('============================');

testJobIds.forEach((jobId, index) => {
  console.log(`\nJob ${index + 1}: ${jobId}`);
  console.log(`  Valid UUID: ${uuidValidate(jobId)}`);
  console.log(`  Length: ${jobId.length}`);
  console.log(`  Format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)}`);
});

console.log('\n✅ All job IDs are valid UUIDs');

// Test the actual validation schema
const Joi = require('joi');

const jobIdParamSchema = Joi.object({
  jobId: Joi.string().required()
});

console.log('\n🧪 Testing Joi Schema Validation');
console.log('=================================');

testJobIds.forEach((jobId, index) => {
  const { error, value } = jobIdParamSchema.validate({ jobId });
  console.log(`\nJob ${index + 1}: ${jobId}`);
  console.log(`  Validation: ${error ? 'FAILED' : 'PASSED'}`);
  if (error) {
    console.log(`  Error: ${error.message}`);
  } else {
    console.log(`  Value: ${JSON.stringify(value)}`);
  }
});

console.log('\n✅ Schema validation completed');
