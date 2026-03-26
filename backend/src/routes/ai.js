const router = require('express').Router();
const multer = require('multer');
const Hotspot = require('../models/Hotspot');
const Complaint = require('../models/Complaint');
const { authenticate, authorize } = require('../middleware/auth');
const aiService = require('../services/aiService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function sendSuccess(res, data, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

function sendFail(res, status, message) {
  return res.status(status).json({ success: false, data: null, message });
}

function mapToLegacyClassification(payload) {
  return {
    label: payload.class,
    confidence: payload.confidence,
    reliable: payload.is_confident,
    all_scores: payload.probabilities,
    model_version: payload.model_version || 'aiml-v1',
  };
}

async function predictWasteHandler(req, res, next) {
  try {
    if (!req.file) return sendFail(res, 400, 'Image required');
    const result = await aiService.predictWaste(req.file.buffer, req.file.mimetype, req.file.originalname);
    return sendSuccess(res, result, 'Waste prediction completed');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return sendFail(res, 503, 'AIML service unavailable');
    return next(err);
  }
}

async function detectHotspotHandler(req, res, next) {
  try {
    const { coordinates } = req.body;
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return sendFail(res, 400, 'Array of coordinates required');
    }

    const result = await aiService.detectHotspots(coordinates);
    return sendSuccess(res, result, 'Hotspot detection completed');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return sendFail(res, 503, 'AIML service unavailable');
    return next(err);
  }
}

async function predictTrendHandler(req, res, next) {
  try {
    const { historical_data, forecast_days } = req.body;
    if (!Array.isArray(historical_data) || historical_data.length === 0) {
      return sendFail(res, 400, 'Array of historical_data required');
    }

    const result = await aiService.predictTrend(historical_data, forecast_days);
    return sendSuccess(res, result, 'Trend prediction completed');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return sendFail(res, 503, 'AIML service unavailable');
    return next(err);
  }
}

// Legacy classify route used by citizen report flow
router.post('/classify', authenticate, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return sendFail(res, 400, 'Image required');
    const prediction = await aiService.predictWaste(req.file.buffer, req.file.mimetype, req.file.originalname);
    return sendSuccess(res, { result: mapToLegacyClassification(prediction) }, 'Classification completed');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return sendFail(res, 503, 'AIML service unavailable');
    return next(err);
  }
});

// Required AI endpoints
router.post('/predict-waste', upload.single('image'), predictWasteHandler);
router.post('/detect-hotspot', detectHotspotHandler);
router.post('/predict-trend', predictTrendHandler);

// Compatibility aliases
router.post('/v2/predict-waste', upload.single('image'), predictWasteHandler);
router.post('/v2/detect-hotspot', detectHotspotHandler);
router.post('/v2/predict-trend', predictTrendHandler);

// Existing data-backed analytics endpoints
router.get('/hotspots', authenticate, async (req, res, next) => {
  try {
    const { ward_id, days = 7 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const filter = { createdAt: { $gte: since } };
    if (ward_id) filter.wardId = ward_id;

    const hotspots = await Hotspot.find(filter)
      .populate('wardId', 'name city')
      .sort({ severityScore: -1 })
      .limit(50)
      .lean();

    return sendSuccess(res, { hotspots }, 'Hotspots fetched');
  } catch (err) {
    return next(err);
  }
});

router.get('/predictions/ward/:id', authenticate, authorize('authority', 'admin'), (req, res) => {
  return sendFail(res, 501, 'Ward prediction endpoint is not enabled in AIML v2');
});

router.get('/heatmap', authenticate, async (req, res, next) => {
  try {
    const { ward_id, days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const filter = { createdAt: { $gte: since }, 'location.coordinates': { $exists: true } };
    if (ward_id) filter.wardId = ward_id;

    const complaints = await Complaint.find(filter).select('location priority issueType').lean();
    const points = complaints.map(c => ({
      lat: c.location.coordinates[1],
      lng: c.location.coordinates[0],
      weight: c.priority,
      issue_type: c.issueType,
    }));

    return sendSuccess(res, { points }, 'Heatmap data fetched');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
