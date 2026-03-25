const router = require('express').Router();
const { Notification } = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

// GET /notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip).limit(Number(limit)).lean(),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);

    res.json({ notifications, unread_count: unreadCount });
  } catch (err) { next(err); }
});

// PUT /notifications/:id/read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PUT /notifications/read-all
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id }, { isRead: true });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
