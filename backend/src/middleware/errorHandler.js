const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.path} - ${err.message}`, { stack: err.stack });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, data: null, message: err.message });
  }
  if (err.code === '23505') {
    return res.status(409).json({ success: false, data: null, message: 'Duplicate entry - resource already exists' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, data: null, message: 'Referenced resource does not exist' });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message;

  return res.status(status).json({ success: false, data: null, message });
}

module.exports = errorHandler;
