const Gamification = require('../models/Gamification');
const logger       = require('../utils/logger');

const POINTS_MAP = {
  complaint_submitted: 50,
  complaint_resolved:  20,
  quiz_passed:         100,
  module_completed:    30,
  daily_login:         10,
  streak_bonus:        25,
};

const BADGES = [
  { key: 'first_report',  label: 'First Report',    condition: g => g.reportsCount === 1 },
  { key: 'reporter_5',    label: 'Active Reporter',  condition: g => g.reportsCount >= 5 },
  { key: 'reporter_25',   label: 'Waste Warrior',    condition: g => g.reportsCount >= 25 },
  { key: 'quiz_master',   label: 'Quiz Master',      condition: g => g.quizzesPassed >= 5 },
  { key: 'eco_learner',   label: 'Eco Learner',      condition: g => g.quizzesPassed >= 1 },
  { key: 'streak_7',      label: '7-Day Streak',     condition: g => g.streakDays >= 7 },
  { key: 'streak_30',     label: 'Monthly Hero',     condition: g => g.streakDays >= 30 },
  { key: 'level_5',       label: 'Eco Champion',     condition: g => g.level >= 5 },
];

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];

function calculateLevel(points) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
}

async function awardPoints(userId, action, customPoints = null) {
  try {
    const points = customPoints ?? POINTS_MAP[action] ?? 0;
    if (points === 0) return;

    const inc = { totalPoints: points };
    if (action === 'complaint_submitted') inc.reportsCount  = 1;
    if (action === 'quiz_passed')         inc.quizzesPassed = 1;

    const g = await Gamification.findOneAndUpdate(
      { userId },
      { $inc: inc, $set: { lastActive: new Date() } },
      { new: true, upsert: true }
    );

    // Update level
    const newLevel = calculateLevel(g.totalPoints);
    if (newLevel !== g.level) {
      await Gamification.findOneAndUpdate({ userId }, { $set: { level: newLevel } });
      g.level = newLevel;
    }

    // Check and award new badges
    const newBadges = BADGES
      .filter(b => !g.badges.includes(b.key) && b.condition(g))
      .map(b => b.key);

    if (newBadges.length) {
      await Gamification.findOneAndUpdate({ userId }, { $addToSet: { badges: { $each: newBadges } } });
    }

    return { points, newBadges, level: newLevel };
  } catch (err) {
    logger.error('awardPoints error:', err);
  }
}

async function getLeaderboard(wardId, limit = 20) {
  // If wardId given, match users in that ward first via lookup
  const pipeline = [
    { $sort: { totalPoints: -1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
  ];

  if (wardId) {
    const { Types } = require('mongoose');
    pipeline.unshift({ $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } });
    pipeline.unshift({ $match: {} }); // will be replaced below
    // Simpler: join then filter
    const results = await Gamification.aggregate([
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.wardId': new Types.ObjectId(wardId) } },
      { $sort: { totalPoints: -1 } },
      { $limit: limit },
      { $project: {
        name:         '$user.name',
        avatarUrl:    '$user.avatarUrl',
        totalPoints:  1, level: 1, badges: 1,
        reportsCount: 1, streakDays: 1,
      }},
    ]);
    return results;
  }

  return Gamification.aggregate([
    { $sort: { totalPoints: -1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: {
      name:         '$user.name',
      avatarUrl:    '$user.avatarUrl',
      totalPoints:  1, level: 1, badges: 1,
      reportsCount: 1, streakDays: 1,
    }},
  ]);
}

module.exports = { awardPoints, getLeaderboard, POINTS_MAP, BADGES };
