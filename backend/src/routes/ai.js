const router = require('express').Router();
const multer = require('multer');
const Hotspot = require('../models/Hotspot');
const Complaint = require('../models/Complaint');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const aiService = require('../services/aiService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/bmp']);

function sendSuccess(res, data, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

function sendFail(res, status, message) {
  return res.status(status).json({ success: false, data: null, message });
}

function buildHotspotDeleteFilter(wardId, days) {
  return wardId ? { wardId, periodDays: days } : { periodDays: days };
}

function parseDays(daysRaw, fallback = 7) {
  const parsed = Number(daysRaw);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(90, Math.round(parsed));
}

function normalizeHotspotDoc(h) {
  const lat = h?.centroid?.coordinates?.[1] ?? null;
  const lng = h?.centroid?.coordinates?.[0] ?? null;
  return {
    id: String(h._id),
    ward_id: h.wardId?._id ? String(h.wardId._id) : (h.wardId ? String(h.wardId) : null),
    ward_name: h.wardId?.name || null,
    city: h.wardId?.city || null,
    centroid_lat: lat,
    centroid_lng: lng,
    complaint_count: Number(h.complaintCount || 0),
    severity_score: Number(h.severityScore || 0),
    dominant_type: h.dominantType || 'other',
    period_days: Number(h.periodDays || 7),
    createdAt: h.createdAt,
  };
}

function computeSeverityScore(count, avgPriority) {
  // Keep score in a stable 0..3 range for frontend severity bands.
  const raw = (count / 4) + (avgPriority * 0.55);
  return Math.max(0.5, Math.min(3, Number(raw.toFixed(2))));
}

function dominantIssueType(points = []) {
  const counts = {};
  for (const p of points) {
    const key = (p?.issue_type || p?.issueType || 'other').toString();
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';
}

function dominantWardId(points = []) {
  const counts = {};
  for (const p of points) {
    if (!p?.ward_id) continue;
    counts[p.ward_id] = (counts[p.ward_id] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function resolveWardScope(req, requestedWardId) {
  if (requestedWardId && !mongoose.isValidObjectId(requestedWardId)) {
    return { error: { status: 400, message: 'Invalid ward_id' } };
  }

  const role = req.user?.role;
  const ownWardId = req.user?.wardId ? String(req.user.wardId) : null;

  if (role === 'authority') {
    if (!ownWardId) {
      return { error: { status: 400, message: 'Authority user is not assigned to a ward' } };
    }
    if (requestedWardId && String(requestedWardId) !== ownWardId) {
      return { error: { status: 403, message: 'Authority users can only access their assigned ward' } };
    }
    return { wardId: ownWardId };
  }

  if (role === 'admin') {
    return { wardId: requestedWardId || undefined };
  }

  return { error: { status: 403, message: 'Insufficient permissions' } };
}

async function generateHotspotsFromComplaints({ wardId, days, persist = true }) {
  const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
  const filter = {
    createdAt: { $gte: since },
    status: { $in: ['pending', 'assigned', 'in_progress'] },
    'location.coordinates': { $exists: true },
  };
  if (wardId) filter.wardId = wardId;

  const complaints = await Complaint.find(filter)
    .select('wardId location issueType priority')
    .lean();

  if (!complaints.length) {
    if (persist) {
      await Hotspot.deleteMany(buildHotspotDeleteFilter(wardId, days));
    }
    return [];
  }

  const coordinates = complaints
    .filter(c => Array.isArray(c.location?.coordinates) && c.location.coordinates.length === 2)
    .map(c => ({
      lat: c.location.coordinates[1],
      long: c.location.coordinates[0],
      issue_type: c.issueType || 'other',
      priority: Number(c.priority || 1),
      ward_id: c.wardId ? String(c.wardId) : null,
    }));

  if (!coordinates.length) {
    if (persist) {
      await Hotspot.deleteMany(buildHotspotDeleteFilter(wardId, days));
    }
    return [];
  }

  const detection = await aiService.detectHotspots(coordinates);
  const clusters = Array.isArray(detection?.clusters) ? detection.clusters : [];

  const docs = clusters.map(cluster => {
    const points = Array.isArray(cluster.points) ? cluster.points : [];
    const count = Number(cluster.count || points.length || 0);
    const avgPriority = points.length
      ? points.reduce((s, p) => s + Number(p.priority || 1), 0) / points.length
      : 1;
    const clusterWardId = wardId || dominantWardId(points);

    return {
      wardId: clusterWardId || undefined,
      centroid: {
        type: 'Point',
        coordinates: [Number(cluster.center?.long || 0), Number(cluster.center?.lat || 0)],
      },
      complaintCount: count,
      severityScore: computeSeverityScore(count, avgPriority),
      dominantType: dominantIssueType(points),
      periodDays: days,
    };
  }).filter(d => Number.isFinite(d.centroid.coordinates[0]) && Number.isFinite(d.centroid.coordinates[1]));

  if (!docs.length) {
    if (persist) {
      await Hotspot.deleteMany(buildHotspotDeleteFilter(wardId, days));
    }
    return [];
  }

  if (persist) {
    await Hotspot.deleteMany(buildHotspotDeleteFilter(wardId, days));
    await Hotspot.insertMany(docs);
  }

  return docs;
}

function extractUploadedFile(req) {
  if (req.file) return req.file;
  if (Array.isArray(req.files) && req.files.length > 0) return req.files[0];
  return null;
}

function uploadImage(req, res, next) {
  return upload.any()(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return sendFail(res, 400, 'Image size exceeds 5MB');
      return sendFail(res, 400, err.message);
    }
    return next(err);
  });
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
    const file = extractUploadedFile(req);
    if (!file) return sendFail(res, 400, 'Image required');
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      return sendFail(res, 400, `Unsupported file type: ${file.mimetype}`);
    }
    const result = await aiService.predictWaste(file.buffer, file.mimetype, file.originalname);
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
router.post('/classify', authenticate, uploadImage, async (req, res, next) => {
  try {
    const file = extractUploadedFile(req);
    if (!file) return sendFail(res, 400, 'Image required');
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      return sendFail(res, 400, `Unsupported file type: ${file.mimetype}`);
    }
    const prediction = await aiService.predictWaste(file.buffer, file.mimetype, file.originalname);
    return sendSuccess(res, { result: mapToLegacyClassification(prediction) }, 'Classification completed');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return sendFail(res, 503, 'AIML service unavailable');
    return next(err);
  }
});

// Required AI endpoints
router.post('/predict-waste', uploadImage, predictWasteHandler);
router.post('/detect-hotspot', detectHotspotHandler);
router.post('/predict-trend', predictTrendHandler);

// Compatibility aliases
router.post('/v2/predict-waste', uploadImage, predictWasteHandler);
router.post('/v2/detect-hotspot', detectHotspotHandler);
router.post('/v2/predict-trend', predictTrendHandler);

// Existing data-backed analytics endpoints
router.get('/hotspots', authenticate, authorize('authority', 'admin'), async (req, res, next) => {
  try {
    const days = parseDays(req.query.days, 7);
    const refresh = String(req.query.refresh || '').toLowerCase() === 'true';
    const requestedWardId = req.query.ward_id;
    const scope = resolveWardScope(req, requestedWardId);
    if (scope.error) {
      return sendFail(res, scope.error.status, scope.error.message);
    }
    const wardId = scope.wardId;

    let hotspotsDocs = await Hotspot.find({
      ...(wardId ? { wardId } : {}),
      periodDays: days,
    })
      .populate('wardId', 'name city')
      .sort({ severityScore: -1 })
      .limit(50)
      .lean();

    if (refresh || hotspotsDocs.length === 0) {
      await generateHotspotsFromComplaints({ wardId, days, persist: true });
      hotspotsDocs = await Hotspot.find({
        ...(wardId ? { wardId } : {}),
        periodDays: days,
      })
        .populate('wardId', 'name city')
        .sort({ severityScore: -1 })
        .limit(50)
        .lean();
    }

    const hotspots = hotspotsDocs.map(normalizeHotspotDoc);
    return sendSuccess(res, { hotspots, days }, 'Hotspots fetched');
  } catch (err) {
    return next(err);
  }
});

router.post('/hotspots/refresh', authenticate, authorize('authority', 'admin'), async (req, res, next) => {
  try {
    const days = parseDays(req.body?.days, 7);
    const requestedWardId = req.body?.ward_id;
    const scope = resolveWardScope(req, requestedWardId);
    if (scope.error) {
      return sendFail(res, scope.error.status, scope.error.message);
    }
    const wardId = scope.wardId;

    await generateHotspotsFromComplaints({ wardId, days, persist: true });
    const hotspotsDocs = await Hotspot.find({
      ...(wardId ? { wardId } : {}),
      periodDays: days,
    })
      .populate('wardId', 'name city')
      .sort({ severityScore: -1 })
      .limit(50)
      .lean();

    const hotspots = hotspotsDocs.map(normalizeHotspotDoc);
    return sendSuccess(res, { hotspots, days }, 'Hotspots refreshed');
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
