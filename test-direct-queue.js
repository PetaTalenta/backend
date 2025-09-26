/**
 * Direct test to RabbitMQ queue to test dynamic analysis implementation
 */

const amqp = require('amqplib');

const RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'assessment_analysis';
const EXCHANGE_NAME = 'atma_exchange';
const ROUTING_KEY = 'analysis.process';

/**
 * Test data for talent mapping
 */
const testTalentMappingJob = {
  jobId: `test-job-${Date.now()}`,
  userId: 'test-user-123',
  userEmail: 'test@example.com',
  assessment_name: 'AI-Driven Talent Mapping',
  assessment_data: {
    riasec: {
      realistic: 65,
      investigative: 85,
      artistic: 45,
      social: 70,
      enterprising: 55,
      conventional: 40
    },
    ocean: {
      openness: 80,
      conscientiousness: 75,
      extraversion: 60,
      agreeableness: 70,
      neuroticism: 35
    },
    viaIs: {
      creativity: 85,
      curiosity: 90,
      judgment: 75,
      loveOfLearning: 80,
      perspective: 70,
      bravery: 65,
      perseverance: 75,
      honesty: 80,
      zest: 60,
      love: 70,
      kindness: 75,
      socialIntelligence: 65,
      teamwork: 70,
      fairness: 75,
      leadership: 60,
      forgiveness: 65,
      humility: 70,
      prudence: 65,
      selfRegulation: 70,
      appreciationOfBeauty: 55,
      gratitude: 75,
      hope: 70,
      humor: 65,
      spirituality: 50
    },
    industryScore: {
      technology: 85,
      healthcare: 60,
      education: 70,
      finance: 55,
      creative: 65
    }
  },
  raw_responses: {
    riasec_responses: ["A", "B", "C", "A", "B"],
    ocean_responses: ["4", "3", "5", "4", "2"],
    viaIs_responses: ["strongly_agree", "agree", "neutral", "agree", "strongly_agree"]
  },
  messageVersion: 'v2'
};

/**
 * Test data for unknown assessment type
 */
const testUnknownJob = {
  jobId: `test-unknown-job-${Date.now()}`,
  userId: 'test-user-456',
  userEmail: 'test2@example.com',
  assessment_name: 'Custom_Personality_Test',
  assessment_data: {
    customField1: "test value",
    customField2: {
      nested: "data"
    },
    scores: [1, 2, 3, 4, 5]
  },
  raw_responses: {
    custom_responses: ["answer1", "answer2", "answer3"]
  },
  messageVersion: 'v2'
};

/**
 * Publish test jobs to RabbitMQ
 */
async function publishTestJobs() {
  let connection;
  let channel;

  try {
    console.log('🔗 Connecting to RabbitMQ...');
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Ensure exchange and queue exist
    await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    console.log('✅ Connected to RabbitMQ\n');

    // Test 1: Talent Mapping Assessment
    console.log('📤 Test 1: Publishing Talent Mapping job...');
    const talentMappingMessage = Buffer.from(JSON.stringify(testTalentMappingJob));
    
    const published1 = channel.publish(
      EXCHANGE_NAME,
      ROUTING_KEY,
      talentMappingMessage,
      {
        persistent: true,
        messageId: testTalentMappingJob.jobId,
        timestamp: Date.now(),
        headers: {
          assessmentType: 'talent_mapping',
          testType: 'dynamic_analysis_test'
        }
      }
    );

    if (published1) {
      console.log('✅ Talent Mapping job published successfully');
      console.log('   Job ID:', testTalentMappingJob.jobId);
      console.log('   Assessment Name:', testTalentMappingJob.assessment_name);
    } else {
      console.log('❌ Failed to publish Talent Mapping job');
    }

    // Wait a bit before sending next job
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Unknown Assessment Type
    console.log('\n📤 Test 2: Publishing Unknown Assessment job...');
    const unknownMessage = Buffer.from(JSON.stringify(testUnknownJob));
    
    const published2 = channel.publish(
      EXCHANGE_NAME,
      ROUTING_KEY,
      unknownMessage,
      {
        persistent: true,
        messageId: testUnknownJob.jobId,
        timestamp: Date.now(),
        headers: {
          assessmentType: 'unknown',
          testType: 'dynamic_analysis_test'
        }
      }
    );

    if (published2) {
      console.log('✅ Unknown Assessment job published successfully');
      console.log('   Job ID:', testUnknownJob.jobId);
      console.log('   Assessment Name:', testUnknownJob.assessment_name);
    } else {
      console.log('❌ Failed to publish Unknown Assessment job');
    }

    console.log('\n🎉 All test jobs published successfully!');
    console.log('📋 Check analysis-worker logs to see the dynamic routing in action');
    console.log('   - Talent Mapping should use TalentMappingAnalyzer');
    console.log('   - Unknown Assessment should use DefaultAnalyzer');

  } catch (error) {
    console.error('❌ Error publishing test jobs:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('\n🔌 RabbitMQ connection closed');
  }
}

// Run the test
publishTestJobs();
