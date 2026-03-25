const router = require('express').Router();
const { TrainingModule, QuizAttempt } = require('../models/Training');
const Gamification = require('../models/Gamification');
const { authenticate } = require('../middleware/auth');
const { awardPoints, getLeaderboard } = require('../services/gamificationService');

// GET /training/modules
router.get('/modules', authenticate, async (req, res, next) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;

    const [modules, attempts] = await Promise.all([
      TrainingModule.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean(),
      QuizAttempt.find({ userId: req.user._id, passed: true }).select('moduleId score pointsEarned').lean(),
    ]);

    const attemptMap = {};
    attempts.forEach(a => { attemptMap[a.moduleId.toString()] = a; });

    const enriched = modules.map(m => ({
      ...m,
      completed:    !!attemptMap[m._id.toString()],
      score:        attemptMap[m._id.toString()]?.score,
      pointsEarned: attemptMap[m._id.toString()]?.pointsEarned,
    }));

    res.json({ modules: enriched });
  } catch (err) { next(err); }
});

// GET /training/modules/:id
router.get('/modules/:id', authenticate, async (req, res, next) => {
  try {
    const module = await TrainingModule.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!module) return res.status(404).json({ error: 'Module not found' });
    res.json(module);
  } catch (err) { next(err); }
});

// POST /training/quiz/submit
router.post('/quiz/submit', authenticate, async (req, res, next) => {
  try {
    const { module_id, answers, score, total_questions } = req.body;
    if (!module_id || score === undefined) {
      return res.status(400).json({ error: 'module_id and score required' });
    }

    const mod = await TrainingModule.findById(module_id);
    if (!mod) return res.status(404).json({ error: 'Module not found' });

    const passed       = score >= Math.ceil(total_questions * 0.6);
    const pointsEarned = passed
      ? mod.pointsReward
      : Math.floor(mod.pointsReward * 0.2);

    const attempt = await QuizAttempt.create({
      userId: req.user._id, moduleId: module_id,
      score, totalQuestions: total_questions,
      passed, pointsEarned, answers: answers || {},
    });

    await awardPoints(req.user._id, passed ? 'quiz_passed' : 'module_completed', pointsEarned);

    res.json({ attempt, passed, points_earned: pointsEarned });
  } catch (err) { next(err); }
});

module.exports = router;

// ── Gamification router (mounted separately) ──────────────────────────────────
const gRouter = require('express').Router();

gRouter.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const wardId = req.query.ward_id || req.user.wardId?.toString();
    const data   = await getLeaderboard(wardId);
    res.json({ leaderboard: data });
  } catch (err) { next(err); }
});

gRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const g = await Gamification.findOne({ userId: req.user._id }).lean();
    res.json(g || {});
  } catch (err) { next(err); }
});

module.exports.gamificationRouter = gRouter;
