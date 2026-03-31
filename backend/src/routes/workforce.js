const router = require('express').Router();
const Worker = require('../models/Worker');
const Complaint = require('../models/Complaint');
const { authenticate, authorize } = require('../middleware/auth');
const { findBestWorker } = require('../services/workforceService');
const { ok, fail } = require('../utils/response');
const logger = require('../utils/logger');

// POST /workforce - Add a new worker
router.post('/', authenticate, authorize('authority', 'admin'), async (req, res, next) => {
  try {
    const { name, phone, employeeId, zone, role, lat, lng, wardId } = req.body;
    
    if (!name || !role) return fail(res, 400, 'Name and role are required');

    const worker = await Worker.create({
      name,
      phone,
      employeeId,
      zone,
      role,
      wardId: wardId || req.user.wardId,
      currentLocation: {
        type: 'Point',
        coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0]
      },
      status: 'available'
    });

    return ok(res, { worker }, 'Worker added to workforce', 201);
  } catch (err) { next(err); }
});

// GET /workforce - List all workers with status
router.get('/', authenticate, authorize('authority', 'admin'), async (req, res, next) => {
  try {
    const { role, status, ward_id } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (ward_id) filter.wardId = ward_id;
    else if (req.user.role === 'authority') filter.wardId = req.user.wardId;

    const workers = await Worker.find(filter)
      .populate('wardId', 'name')
      .populate('assignedTasks', 'issueType status priority')
      .sort({ name: 1 })
      .lean();

    return ok(res, { workers }, 'Workforce fetched');
  } catch (err) { next(err); }
});

// PATCH /workforce/assign - Smart Auto-Assignment
router.patch('/assign', authenticate, authorize('authority', 'admin'), async (req, res, next) => {
  try {
    const { complaint_id } = req.body;
    if (!complaint_id) return fail(res, 400, 'complaint_id is required');

    const complaint = await Complaint.findById(complaint_id);
    if (!complaint) return fail(res, 404, 'Complaint not found');
    if (complaint.status !== 'pending') return fail(res, 400, 'Complaint is already assigned or resolved');

    const bestWorker = await findBestWorker(complaint);
    if (!bestWorker) {
      logger.info(`No available worker found for complaint ${complaint_id}`);
      return fail(res, 404, 'No available workers found nearby');
    }

    // Perform assignment
    await Promise.all([
      Complaint.findByIdAndUpdate(complaint_id, {
        status: 'assigned',
        $push: {
          assignments: {
            workerId: bestWorker._id,
            assignedBy: req.user._id,
            notes: 'Auto-assigned by Workforce Smart Logic'
          }
        }
      }),
      Worker.findByIdAndUpdate(bestWorker._id, {
        status: 'busy',
        $push: { assignedTasks: complaint_id },
        lastActiveAt: new Date()
      })
    ]);

    logger.info(`Complaint ${complaint_id} smart-assigned to worker ${bestWorker.name} (Dist: ${bestWorker.distance.toFixed(2)}km)`);
    
    return ok(res, { worker: bestWorker }, `Smart assigned to ${bestWorker.name} (${bestWorker.distance.toFixed(2)}km away)`);
  } catch (err) { next(err); }
});

// PATCH /workforce/:id/location - Update worker location dynamically
router.patch('/:id/location', authenticate, async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) return fail(res, 400, 'lat and lng required');

    const worker = await Worker.findByIdAndUpdate(req.params.id, {
      currentLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      lastActiveAt: new Date()
    }, { new: true });

    if (!worker) return fail(res, 404, 'Worker not found');
    return ok(res, { worker }, 'Location updated');
  } catch (err) { next(err); }
});

module.exports = router;
