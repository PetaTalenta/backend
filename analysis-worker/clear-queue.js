const amqp = require('amqplib');

async function clearQueue() {
  try {
    console.log('🐰 Connecting to RabbitMQ...');
    const connection = await amqp.connect('amqp://localhost:5672');
    const channel = await connection.createChannel();
    
    const queueName = 'assessment_analysis';
    
    // Get queue info
    const queueInfo = await channel.checkQueue(queueName);
    console.log(`📊 Queue "${queueName}" has ${queueInfo.messageCount} messages`);
    
    if (queueInfo.messageCount > 0) {
      // Purge the queue
      await channel.purgeQueue(queueName);
      console.log(`🧹 Queue "${queueName}" has been cleared!`);
    } else {
      console.log(`✅ Queue "${queueName}" is already empty`);
    }
    
    await connection.close();
    console.log('🔌 Connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearQueue();
