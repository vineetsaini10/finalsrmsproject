const mongoose = require('mongoose');
const logger = require('../utils/logger');

function describeMongoTarget(uri) {
  try {
    const normalized = uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')
      ? uri
      : `mongodb://${uri}`;
    const parsed = new URL(normalized);
    const protocol = parsed.protocol.replace(':', '');
    const host = parsed.hostname || 'localhost';
    const port = parsed.port || (protocol === 'mongodb+srv' ? 'default' : '27017');
    const dbName = parsed.pathname.replace(/^\//, '') || 'admin';
    return `${protocol}://${host}:${port}/${dbName}`;
  } catch (_err) {
    return 'unparseable MongoDB URI';
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  logger.info(`Connecting to MongoDB at ${describeMongoTarget(uri)}`);

  await mongoose.connect(uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

module.exports = { connectDB, mongoose };
