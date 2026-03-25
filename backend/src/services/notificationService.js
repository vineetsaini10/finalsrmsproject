const { Notification } = require('../models/Notification');
const User             = require('../models/User');
const logger           = require('../utils/logger');

async function createNotification(userId, title, body, type, data = {}) {
  try {
    await Notification.create({ userId, title, body, type, data });
  } catch (err) {
    logger.error('createNotification error:', err);
  }
}

async function notifyAuthorities(complaint) {
  try {
    const authorities = await User.find({
      role:   { $in: ['authority', 'admin'] },
      $or:    [{ wardId: complaint.wardId }, { wardId: { $exists: false } }],
    }).select('_id').lean();

    await Promise.all(authorities.map(a =>
      createNotification(
        a._id,
        `Urgent: ${complaint.issueType.replace(/_/g, ' ')}`,
        `New high-priority complaint at ${complaint.address || 'unknown location'}`,
        'complaint_update',
        { complaintId: complaint._id }
      )
    ));
  } catch (err) {
    logger.error('notifyAuthorities error:', err);
  }
}

async function notifyCitizen(userId, title, body, data = {}) {
  return createNotification(userId, title, body, 'complaint_update', data);
}

module.exports = { createNotification, notifyAuthorities, notifyCitizen };
