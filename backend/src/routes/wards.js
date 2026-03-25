const router = require('express').Router();
const Ward   = require('../models/Ward');
const { authenticate, authorize } = require('../middleware/auth');

// GET /wards
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { city, state } = req.query;
    const filter = {};
    if (city)  filter.city  = { $regex: city,  $options: 'i' };
    if (state) filter.state = { $regex: state, $options: 'i' };

    const wards = await Ward.find(filter).select('-boundary').sort({ city: 1, name: 1 }).lean();
    res.json({ wards });
  } catch (err) { next(err); }
});

// GET /wards/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const ward = await Ward.findById(req.params.id).lean();
    if (!ward) return res.status(404).json({ error: 'Ward not found' });
    res.json(ward);
  } catch (err) { next(err); }
});

// POST /wards — admin only
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, ulbCode, city, state } = req.body;
    const ward = await Ward.create({ name, ulbCode, city, state });
    res.status(201).json(ward);
  } catch (err) { next(err); }
});

module.exports = router;
