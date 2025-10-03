const amqp = require('amqplib');
const logger = require('../utils/logger');

// RabbitMQ configuration
const config = {
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  exchange: process.env.EXCHANGE_NAME || 'atma_exchange',
  queue: process.env.QUEUE_NAME || 'assessment_analysis',
  routingKey: process.env.ROUTING_KEY || 'analysis.process',
  // Events configuration for event-driven architecture
  eventsExchange: process.env.EVENTS_EXCHANGE_NAME || 'atma_events_exchange',
  assessmentsQueue: process.env.EVENTS_QUEUE_NAME_ASSESSMENTS || 'analysis_events_assessments',
  eventsRoutingKeys: {
    analysisCompleted: 'analysis.completed',
    analysisFailed: 'analysis.failed',
    analysisStarted: 'analysis.started'
  },
  options: {
    durable: process.env.QUEUE_DURABLE === 'true',
    persistent: process.env.MESSAGE_PERSISTENT === 'true'
  }
};

// Connection and channel variables
let connection = null;
let channel = null;

/**
 * Initialize RabbitMQ connection and setup exchange/queue
 * @returns {Promise<Object>} - RabbitMQ channel
 */
const initialize = async() => {
  try {
    // Create connection
    logger.info('Connecting to RabbitMQ...', { url: config.url });
    connection = await amqp.connect(config.url);

    // Handle connection close
    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      setTimeout(reconnect, 5000);
    });

    // Handle connection error
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { error: err.message });
      setTimeout(reconnect, 5000);
    });

    // Create channel
    channel = await connection.createChannel();

    // Handle channel events
    channel.on('close', () => {
      logger.warn('RabbitMQ channel closed');
      channel = null;
    });

    channel.on('error', (err) => {
      logger.error('RabbitMQ channel error', { error: err.message });
    });

    // Setup main exchange for job publishing
    await channel.assertExchange(config.exchange, 'direct', {
      durable: config.options.durable
    });

    // Setup events exchange for event-driven architecture
    await channel.assertExchange(config.eventsExchange, 'topic', {
      durable: true
    });

    // Setup main queue with dead letter exchange
    await channel.assertQueue(config.queue, {
      durable: config.options.durable,
      arguments: {
        'x-dead-letter-exchange': config.exchange,
        'x-dead-letter-routing-key': 'dlq'
      }
    });

    // Setup assessments events queue
    await channel.assertQueue(config.assessmentsQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': `${config.eventsExchange}_dlx`,
        'x-dead-letter-routing-key': 'assessments.dlq'
      }
    });

    // Bind main queue to exchange
    await channel.bindQueue(config.queue, config.exchange, config.routingKey);

    // Bind events queue to events exchange with routing keys
    await channel.bindQueue(config.assessmentsQueue, config.eventsExchange, config.eventsRoutingKeys.analysisCompleted);
    await channel.bindQueue(config.assessmentsQueue, config.eventsExchange, config.eventsRoutingKeys.analysisFailed);
    await channel.bindQueue(config.assessmentsQueue, config.eventsExchange, config.eventsRoutingKeys.analysisStarted);

    logger.info('RabbitMQ connection established successfully', {
      exchange: config.exchange,
      queue: config.queue,
      routingKey: config.routingKey,
      eventsExchange: config.eventsExchange,
      assessmentsQueue: config.assessmentsQueue
    });

    return channel;
  } catch (error) {
    logger.error('Failed to initialize RabbitMQ', { error: error.message });
    throw error;
  }
};

/**
 * Reconnect to RabbitMQ
 */
const reconnect = async() => {
  try {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logger.error('Error closing existing RabbitMQ connection', { error: err.message });
      }
    }

    await initialize();
  } catch (error) {
    logger.error('Failed to reconnect to RabbitMQ', { error: error.message });
    setTimeout(reconnect, 5000);
  }
};

/**
 * Get RabbitMQ channel (initialize if needed)
 * @returns {Promise<Object>} - RabbitMQ channel
 */
const getChannel = async() => {
  if (!channel) {
    await initialize();
  }
  return channel;
};

/**
 * Close RabbitMQ connection
 */
const close = async() => {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    logger.info('RabbitMQ connection closed gracefully');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection', { error: error.message });
    throw error;
  }
};

/**
 * Check if RabbitMQ connection is healthy
 * @returns {Promise<boolean>} - Connection status
 */
const checkHealth = async() => {
  try {
    if (!connection || !channel) {
      return false;
    }

    // Check if connection is still alive
    if (!connection.connection || connection.connection.closed) {
      return false;
    }

    // Perform a simple operation to test connectivity
    try {
      await channel.checkQueue(config.queue);
      return true;
    } catch (queueError) {
      return false;
    }
  } catch (error) {
    return false;
  }
};

module.exports = {
  initialize,
  getChannel,
  close,
  checkHealth,
  config
};
