#!/usr/bin/env node

/**
 * Script untuk membersihkan DLQ analysis-worker
 * Created: 2025-10-02
 */

const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
const DLQ_NAME = 'assessment_analysis_dlq';

async function cleanupDLQ() {
  let connection;
  let channel;
  
  try {
    console.log('🔌 Connecting to RabbitMQ...');
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Ensure queue exists
    await channel.assertQueue(DLQ_NAME, { durable: true });
    
    // Get queue info
    const queueInfo = await channel.checkQueue(DLQ_NAME);
    console.log(`📊 Found ${queueInfo.messageCount} messages in DLQ`);
    
    if (queueInfo.messageCount === 0) {
      console.log('✅ DLQ is already empty');
      return;
    }
    
    console.log('\n📋 Analyzing failed messages...\n');
    
    let messagesProcessed = 0;
    let messagesToDelete = [];
    
    // Consume all messages from DLQ
    while (true) {
      const msg = await channel.get(DLQ_NAME, { noAck: false });
      
      if (!msg) {
        break; // No more messages
      }
      
      messagesProcessed++;
      
      try {
        const content = JSON.parse(msg.content.toString());
        console.log(`📨 Message ${messagesProcessed}:`);
        console.log(`   Job ID: ${content.jobId || 'N/A'}`);
        console.log(`   User ID: ${content.userId || 'N/A'}`);
        console.log(`   Assessment ID: ${content.assessmentId || 'N/A'}`);
        
        if (msg.properties.headers) {
          console.log(`   Death Count: ${msg.properties.headers['x-death']?.[0]?.count || 'N/A'}`);
          console.log(`   First Death: ${msg.properties.headers['x-death']?.[0]?.time || 'N/A'}`);
          console.log(`   Reason: ${msg.properties.headers['x-death']?.[0]?.reason || 'N/A'}`);
        }
        console.log('');
        
        messagesToDelete.push(msg);
      } catch (err) {
        console.error(`   ❌ Failed to parse message: ${err.message}`);
        messagesToDelete.push(msg);
      }
    }
    
    console.log(`\n🗑️  Deleting ${messagesToDelete.length} messages from DLQ...\n`);
    
    // Delete all messages (acknowledge them)
    for (const msg of messagesToDelete) {
      channel.ack(msg);
    }
    
    console.log(`✅ Successfully cleaned ${messagesProcessed} messages from DLQ`);
    
    // Verify DLQ is empty
    const finalInfo = await channel.checkQueue(DLQ_NAME);
    console.log(`\n📊 Final DLQ count: ${finalInfo.messageCount} messages`);
    
  } catch (error) {
    console.error('❌ Error cleaning DLQ:', error);
    throw error;
  } finally {
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
}

// Run the cleanup
cleanupDLQ()
  .then(() => {
    console.log('\n✅ Cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
