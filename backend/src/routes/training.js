const express = require('express');
const Gamification = require('../models/Gamification');
const { authenticate } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { getLeaderboard } = require('../services/gamificationService');
const {
  getLearningModule,
  getQuizByModule,
  getQuizResult,
  getUserProgress,
  listLearningModules,
  submitQuiz,
  updateGamification,
} = require('../services/learningService');

const trainingRouter = express.Router();

trainingRouter.get('/modules', authenticate, async (req, res, next) => {
  try {
    const modules = await listLearningModules(req.user._id, req.query.category);
    return ok(res, { modules }, 'Modules fetched');
  } catch (err) {
    next(err);
  }
});

trainingRouter.get('/modules/:id', authenticate, async (req, res, next) => {
  try {
    const module = await getLearningModule(req.params.id, req.user._id);
    if (!module) return fail(res, 404, 'Module not found');
    return ok(res, module, 'Module fetched');
  } catch (err) {
    next(err);
  }
});

trainingRouter.post('/quiz/submit', authenticate, async (req, res, next) => {
  try {
    const result = await submitQuiz(req.user._id, req.body);
    if (result.error) return fail(res, result.status, result.error, result.data ? { data: result.data } : {});
    return ok(res, result.data, 'Quiz submitted');
  } catch (err) {
    next(err);
  }
});

trainingRouter.get('/progress', authenticate, async (req, res, next) => {
  try {
    const progress = await getUserProgress(req.user._id);
    return ok(res, progress, 'Learning progress fetched');
  } catch (err) {
    next(err);
  }
});

const learningRouter = express.Router();

learningRouter.get('/modules', authenticate, async (req, res, next) => {
  try {
    const modules = await listLearningModules(req.user._id, req.query.category);
    return ok(res, { modules }, 'Learning modules fetched');
  } catch (err) {
    next(err);
  }
});

learningRouter.get('/module/:id', authenticate, async (req, res, next) => {
  try {
    const module = await getLearningModule(req.params.id, req.user._id);
    if (!module) return fail(res, 404, 'Module not found');
    return ok(res, module, 'Learning module fetched');
  } catch (err) {
    next(err);
  }
});

const quizRouter = express.Router();

quizRouter.get('/:moduleId', authenticate, async (req, res, next) => {
  try {
    const quiz = await getQuizByModule(req.params.moduleId, req.user._id);
    if (!quiz) return fail(res, 404, 'Module not found');
    return ok(res, quiz, 'Quiz fetched');
  } catch (err) {
    next(err);
  }
});

quizRouter.get('/:moduleId/result', authenticate, async (req, res, next) => {
  try {
    const result = await getQuizResult(req.params.moduleId, req.user._id);
    if (!result) return fail(res, 404, 'Quiz result not found');
    return ok(res, result, 'Quiz result fetched');
  } catch (err) {
    next(err);
  }
});

quizRouter.post('/submit', authenticate, async (req, res, next) => {
  try {
    const result = await submitQuiz(req.user._id, req.body);
    if (result.error) return fail(res, result.status, result.error, result.data ? { data: result.data } : {});
    return ok(res, result.data, 'Quiz submitted');
  } catch (err) {
    next(err);
  }
});

const userRouter = express.Router();

userRouter.get('/progress', authenticate, async (req, res, next) => {
  try {
    const progress = await getUserProgress(req.user._id);
    return ok(res, progress, 'User progress fetched');
  } catch (err) {
    next(err);
  }
});

const gamificationRouter = express.Router();

gamificationRouter.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const wardId = req.query.ward_id || req.user.wardId?.toString();
    const leaderboard = await getLeaderboard(wardId);
    return ok(res, { leaderboard }, 'Leaderboard fetched');
  } catch (err) {
    next(err);
  }
});

gamificationRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const profile = await Gamification.findOne({ userId: req.user._id }).lean();
    return ok(res, profile || {}, 'Gamification profile fetched');
  } catch (err) {
    next(err);
  }
});

gamificationRouter.post('/update', authenticate, async (req, res, next) => {
  try {
    const result = await updateGamification(req.user._id, req.body);
    if (result.error) return fail(res, result.status, result.error);
    return ok(res, result.data, 'Gamification updated');
  } catch (err) {
    next(err);
  }
});

module.exports = trainingRouter;
module.exports.learningRouter = learningRouter;
module.exports.quizRouter = quizRouter;
module.exports.userRouter = userRouter;
module.exports.gamificationRouter = gamificationRouter;
