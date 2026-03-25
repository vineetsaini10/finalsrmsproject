const router  = require('express').Router();
const multer  = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const axios   = require('axios');

const Complaint    = require('../models/Complaint');
const Worker       = require('../models/Worker');
const Ward         = require('../models/Ward');
const { authenticate, authorize } = require('../middleware/auth');
const { awardPoints }             = require('../services/gamificationService');
const { notifyAuthorities }       = require('../services/notificationService');
const { queueAIClassification }   = require('../jobs/aiQueue');
const logger = require('../utils/logger');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const PRIORITY_MAP = {
  burning_waste: 3, illegal_dumping: 3,
  full_dustbin: 2, overflowing_bin: 2,
  missed_collection: 1, stray_animal_waste: 1, other: 1,
};

async function uploadToS3(buffer, mimetype) {
  const key = `complaints/${uuidv4()}.jpg`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: mimetype,
  }));
  return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GMAPS_API_KEY}`
    );
    return res.data.results[0]?.formatted_address || '';
  } catch { return ''; }
}

// POST /complaints
router.post('/', authenticate, upload.single('image'), async (req, res, next) => {
  try {
    const { issue_type, lat, lng, description } = req.body;
    if (!issue_type || !lat || !lng) return res.status(400).json({ error: 'issue_type, lat, lng required' });

    let imageUrl = null;
    if (req.file) imageUrl = await uploadToS3(req.file.buffer, req.file.mimetype);

    const address  = await reverseGeocode(lat, lng);
    const priority = PRIORITY_MAP[issue_type] || 1;

    const complaint = await Complaint.create({
      userId:    req.user._id,
      wardId:    req.user.wardId,
      issueType: issue_type,
      priority,
      imageUrl,
      location:  { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      address,
      description: description || '',
    });

    if (imageUrl) await queueAIClassification({ complaintId: complaint._id.toString(), imageUrl });
    await awardPoints(req.user._id, 'complaint_submitted');
    if (priority >= 3) await notifyAuthorities(complaint);

    logger.info(`New complaint [${issue_type}] by ${req.user._id}`);
    res.status(201).json({ success: true, complaint });
  } catch (err) { next(err); }
});

// GET /complaints
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, issue_type, priority, start_date, end_date, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'citizen') filter.userId = req.user._id;
    else if (req.user.role === 'authority' && req.user.wardId) filter.wardId = req.user.wardId;

    if (status)     filter.status    = status;
    if (issue_type) filter.issueType = issue_type;
    if (priority)   filter.priority  = Number(priority);
    if (start_date || end_date) {
      filter.createdAt = {};
      if (start_date) filter.createdAt.$gte = new Date(start_date);
      if (end_date)   filter.createdAt.$lte = new Date(end_date);
    }

    const skip  = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Complaint.find(filter)
        .populate('userId', 'name')
        .populate('wardId', 'name city')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip).limit(Number(limit)).lean(),
      Complaint.countDocuments(filter),
    ]);

    res.json({
      data,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

// GET /complaints/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('userId', 'name phone')
      .populate('wardId', 'name city')
      .populate('assignments.workerId', 'name phone')
      .lean();
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    res.json(complaint);
  } catch (err) { next(err); }
});

// PUT /complaints/:id/status
router.put('/:id/status', authenticate, authorize('authority', 'admin'), async (req, res, next) => {
  try {
    const { status, rejection_note } = req.body;
    const valid = ['pending','assigned','in_progress','resolved','rejected'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const update = { status, rejectionNote: rejection_note || undefined };
    if (status === 'resolved') update.resolvedAt = new Date();

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ success: true, complaint });
  } catch (err) { next(err); }
});

// POST /complaints/:id/assign
router.post('/:id/assign', authenticate, authorize('authority', 'admin'), async (req, res, next) => {
  try {
    const { worker_id, notes } = req.body;
    if (!worker_id) return res.status(400).json({ error: 'worker_id required' });

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        status: 'assigned',
        $push: {
          assignments: {
            workerId:   worker_id,
            assignedBy: req.user._id,
            notes:      notes || undefined,
          },
        },
      },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    res.status(201).json({ success: true, complaint });
  } catch (err) { next(err); }
});

// POST /complaints/:id/upvote
router.post('/:id/upvote', authenticate, async (req, res, next) => {
  try {
    const c = await Complaint.findByIdAndUpdate(req.params.id, { $inc: { upvotes: 1 } }, { new: true });
    res.json({ id: c._id, upvotes: c.upvotes });
  } catch (err) { next(err); }
});

module.exports = router;
