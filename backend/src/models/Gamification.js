const { Schema, model } = require('mongoose');

const gamificationSchema = new Schema({
  userId:        { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  totalPoints:   { type: Number, default: 0 },
  badges:        { type: [String], default: [] },
  reportsCount:  { type: Number, default: 0 },
  resolvedCount: { type: Number, default: 0 },
  quizzesPassed: { type: Number, default: 0 },
  streakDays:    { type: Number, default: 0 },
  level:         { type: Number, default: 1 },
  lastActive:    { type: Date, default: Date.now },
}, { timestamps: true });

gamificationSchema.index({ userId: 1 });
gamificationSchema.index({ totalPoints: -1 });

module.exports = model('Gamification', gamificationSchema);
