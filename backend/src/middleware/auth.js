const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, data: null, message: 'No token provided' });
    }
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET || 'fallback_secret_123');

    const user = await User.findById(decoded.userId)
      .select('name phone email role wardId isVerified')
      .lean();
    if (!user) return res.status(401).json({ success: false, data: null, message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, data: null, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, data: null, message: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, data: null, message: 'Insufficient permissions' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token   = header.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET || 'fallback_secret_123');
      const user    = await User.findById(decoded.userId).select('name role wardId').lean();
      if (user) req.user = user;
    }
  } catch {}
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
