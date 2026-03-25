const router = require('express').Router();
const Worker = require('../models/Worker');
const { authenticate, authorize } = require('../middleware/auth');

// GET /workers
router.get('/', authenticate, authorize('authority', 'admin'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (req.user.wardId) filter.wardId = req.user.wardId;
    if (status)          filter.status  = status;

    const workers = await Worker.find(filter)
      .populate('wardId', 'name')
      .sort({ name: 1 })
      .lean();

    res.json({ workers });
  } catch (err) { next(err); }
});

// GET /workers/:id
router.get('/:id', authenticate, authorize('authority', 'admin'), async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id).populate('wardId', 'name city').lean();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (err) { next(err); }
});

// PUT /workers/:id/status
router.put('/:id/status', authenticate, authorize('authority', 'admin', 'worker'), async (req, res, next) => {
  try {
    const { status, lat, lng } = req.body;
    const update = { status };
    if (lat && lng) update.currentLocation = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };

    const worker = await Worker.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (err) { next(err); }
});

module.exports = router;
