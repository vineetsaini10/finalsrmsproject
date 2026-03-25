const router    = require('express').Router();
const multer    = require('multer');
const axios     = require('axios');
const FormData  = require('form-data');
const Complaint = require('../models/Complaint');
const Hotspot   = require('../models/Hotspot');
const { authenticate, authorize } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

// POST /ai/classify
router.post('/classify', authenticate, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required' });
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: 'waste.jpg', contentType: req.file.mimetype });
    const aiRes = await axios.post(`${AI_URL}/api/v1/classify`, form, { headers: form.getHeaders(), timeout: 15000 });
    res.json(aiRes.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return res.status(503).json({ error: 'AI service unavailable' });
    next(err);
  }
});

// GET /ai/hotspots
router.get('/hotspots', authenticate, async (req, res, next) => {
  try {
    const { ward_id, days = 7 } = req.query;
    const since  = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const filter = { createdAt: { $gte: since } };
    if (ward_id) filter.wardId = ward_id;

    const hotspots = await Hotspot.find(filter)
      .populate('wardId', 'name city')
      .sort({ severityScore: -1 })
      .limit(50).lean();

    res.json({ hotspots });
  } catch (err) { next(err); }
});

// GET /ai/predictions/ward/:id
router.get('/predictions/ward/:id', authenticate, authorize('authority', 'admin'), async (req, res, next) => {
  try {
    const aiRes = await axios.get(`${AI_URL}/api/v1/predict/ward/${req.params.id}`, { timeout: 20000 });
    res.json(aiRes.data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return res.status(503).json({ error: 'AI service unavailable' });
    next(err);
  }
});

// GET /ai/heatmap
router.get('/heatmap', authenticate, async (req, res, next) => {
  try {
    const { ward_id, days = 30 } = req.query;
    const since  = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const filter = { createdAt: { $gte: since }, 'location.coordinates': { $exists: true } };
    if (ward_id) filter.wardId = ward_id;

    const complaints = await Complaint.find(filter).select('location priority issueType').lean();
    const points = complaints.map(c => ({
      lat:        c.location.coordinates[1],
      lng:        c.location.coordinates[0],
      weight:     c.priority,
      issue_type: c.issueType,
    }));

    res.json({ points });
  } catch (err) { next(err); }
});

module.exports = router;
