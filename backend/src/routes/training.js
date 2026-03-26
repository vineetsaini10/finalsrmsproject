const router = require('express').Router();
const { TrainingModule, QuizAttempt, ModuleProgress } = require('../models/Training');
const Gamification = require('../models/Gamification');
const { authenticate } = require('../middleware/auth');
const { awardPoints, getLeaderboard } = require('../services/gamificationService');
const { ok, fail } = require('../utils/response');

// GET /training/modules
router.get('/modules', authenticate, async (req, res, next) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;

    const [modules, attempts, progressRows] = await Promise.all([
      TrainingModule.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean(),
      QuizAttempt.find({ userId: req.user._id, passed: true }).select('moduleId score pointsEarned').lean(),
      ModuleProgress.find({ userId: req.user._id, completed: true }).select('moduleId pointsEarned').lean(),
    ]);

    const attemptMap = {};
    attempts.forEach(a => { attemptMap[a.moduleId.toString()] = a; });
    const progressMap = {};
    progressRows.forEach(p => { progressMap[p.moduleId.toString()] = p; });

    const enriched = modules.map(m => ({
      id: m._id.toString(),
      title: m.title,
      description: m.description,
      category: m.category,
      content_type: m.contentType,
      content_url: m.contentUrl,
      thumbnail_url: m.thumbnailUrl,
      points_reward: m.pointsReward,
      duration_mins: m.durationMins,
      sort_order: m.sortOrder,
      completed: !!progressMap[m._id.toString()] || !!attemptMap[m._id.toString()],
      score: attemptMap[m._id.toString()]?.score,
      points_earned: progressMap[m._id.toString()]?.pointsEarned ?? attemptMap[m._id.toString()]?.pointsEarned ?? 0,
      quiz_questions: (m.quizQuestions || []).map(q => ({
        question: q.question,
        options: q.options || [],
      })),
    }));

    return ok(res, { modules: enriched }, 'Modules fetched');
  } catch (err) { next(err); }
});

// GET /training/modules/:id
router.get('/modules/:id', authenticate, async (req, res, next) => {
  try {
    const module = await TrainingModule.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!module) return fail(res, 404, 'Module not found');
    const progress = await ModuleProgress.findOne({ userId: req.user._id, moduleId: module._id, completed: true }).lean();
    return ok(res, {
      id: module._id.toString(),
      title: module.title,
      description: module.description,
      category: module.category,
      content_type: module.contentType,
      content_url: module.contentUrl,
      thumbnail_url: module.thumbnailUrl,
      points_reward: module.pointsReward,
      duration_mins: module.durationMins,
      sort_order: module.sortOrder,
      completed: !!progress,
      quiz_questions: (module.quizQuestions || []).map(q => ({
        question: q.question,
        options: q.options || [],
      })),
    }, 'Module fetched');
  } catch (err) { next(err); }
});

// POST /training/modules/:id/complete
router.post('/modules/:id/complete', authenticate, async (req, res, next) => {
  try {
    const mod = await TrainingModule.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!mod) return fail(res, 404, 'Module not found');
    if (mod.contentType === 'quiz') {
      return fail(res, 400, 'Quiz modules must be completed via quiz submission');
    }

    const existing = await ModuleProgress.findOne({ userId: req.user._id, moduleId: mod._id, completed: true }).lean();
    if (existing) {
      return ok(res, { completed: true, points_earned: 0, already_rewarded: true }, 'Module already completed');
    }

    await ModuleProgress.create({
      userId: req.user._id,
      moduleId: mod._id,
      completed: true,
      pointsEarned: mod.pointsReward,
      completedAt: new Date(),
    });
    await awardPoints(req.user._id, 'module_completed', mod.pointsReward);

    return ok(res, { completed: true, points_earned: mod.pointsReward, already_rewarded: false }, 'Module completed');
  } catch (err) { next(err); }
});

// POST /training/quiz/submit
router.post('/quiz/submit', authenticate, async (req, res, next) => {
  try {
    const { module_id, answers } = req.body;
    if (!module_id || !answers || typeof answers !== 'object') {
      return fail(res, 400, 'module_id and answers required');
    }

    const mod = await TrainingModule.findById(module_id);
    if (!mod) return fail(res, 404, 'Module not found');

    const questionCount = (mod.quizQuestions || []).length;
    if (questionCount === 0) return fail(res, 400, 'Module does not contain quiz questions');

    let score = 0;
    mod.quizQuestions.forEach((q, idx) => {
      if (Number(answers[idx]) === Number(q.answerIndex)) score += 1;
    });
    const totalQuestions = questionCount;

    const passed = score >= Math.ceil(totalQuestions * 0.6);

    const attempt = await QuizAttempt.create({
      userId: req.user._id, moduleId: module_id,
      score, totalQuestions,
      passed, pointsEarned: 0, answers: answers || {},
    });

    if (!passed) {
      const payload = { attempt, passed, points_earned: 0, already_rewarded: false };
      return ok(res, payload, 'Quiz submitted');
    }

    const existing = await ModuleProgress.findOne({ userId: req.user._id, moduleId: mod._id, completed: true }).lean();
    if (existing) {
      const payload = { attempt, passed, points_earned: 0, already_rewarded: true };
      return ok(res, payload, 'Quiz submitted');
    }

    await ModuleProgress.create({
      userId: req.user._id,
      moduleId: mod._id,
      completed: true,
      pointsEarned: mod.pointsReward,
      completedAt: new Date(),
    });
    await awardPoints(req.user._id, 'quiz_passed', mod.pointsReward);

    const payload = { attempt, passed, points_earned: mod.pointsReward, already_rewarded: false };
    return ok(res, payload, 'Quiz submitted');
  } catch (err) { next(err); }
});

module.exports = router;

// ── Gamification router (mounted separately) ──────────────────────────────────
const gRouter = require('express').Router();

gRouter.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const wardId = req.query.ward_id || req.user.wardId?.toString();
    const data   = await getLeaderboard(wardId);
    return ok(res, { leaderboard: data }, 'Leaderboard fetched');
  } catch (err) { next(err); }
});

gRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const g = await Gamification.findOne({ userId: req.user._id }).lean();
    return ok(res, g || {}, 'Gamification profile fetched');
  } catch (err) { next(err); }
});

module.exports.gamificationRouter = gRouter;
