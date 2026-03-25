const { createClient } = require('redis');
const logger = require('../utils/logger');

let client;

async function connectRedis() {
  client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.on('error', err => logger.error('Redis error:', err));
  client.on('connect', () => logger.info('Redis connected'));
  await client.connect();
}

function getRedis() {
  if (!client) throw new Error('Redis not initialized');
  return client;
}

async function setEx(key, seconds, value) {
  return getRedis().setEx(key, seconds, JSON.stringify(value));
}

async function get(key) {
  const val = await getRedis().get(key);
  return val ? JSON.parse(val) : null;
}

async function del(key) {
  return getRedis().del(key);
}

module.exports = { connectRedis, getRedis, setEx, get, del };
