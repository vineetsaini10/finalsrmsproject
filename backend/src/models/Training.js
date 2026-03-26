const { Schema, model } = require('mongoose');

const trainingModuleSchema = new Schema({
  title:        { type: String, required: true },
  description:  { type: String },
  category:     { type: String, enum: ['segregation','composting','recycling','awareness','policy'] },
  contentType:  { type: String, enum: ['video','infographic','quiz','article'] },
  contentUrl:   { type: String },
  thumbnailUrl: { type: String },
  pointsReward: { type: Number, default: 10 },
  durationMins: { type: Number },
  isActive:     { type: Boolean, default: true },
  sortOrder:    { type: Number, default: 0 },
  quizQuestions: [{
    question: { type: String, required: true },
    options:  { type: [String], default: [] },
    answerIndex: { type: Number, required: true },
  }],
}, { timestamps: true });

trainingModuleSchema.index({ category: 1, isActive: 1 });

const quizAttemptSchema = new Schema({
  userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  moduleId:       { type: Schema.Types.ObjectId, ref: 'TrainingModule', required: true },
  score:          { type: Number },
  totalQuestions: { type: Number },
  passed:         { type: Boolean },
  pointsEarned:   { type: Number, default: 0 },
  answers:        { type: Schema.Types.Mixed },
}, { timestamps: true });

quizAttemptSchema.index({ userId: 1, moduleId: 1 });

const moduleProgressSchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  moduleId:     { type: Schema.Types.ObjectId, ref: 'TrainingModule', required: true },
  completed:    { type: Boolean, default: true },
  pointsEarned: { type: Number, default: 0 },
  completedAt:  { type: Date, default: Date.now },
}, { timestamps: true });

moduleProgressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

const TrainingModule = model('TrainingModule', trainingModuleSchema);
const QuizAttempt    = model('QuizAttempt', quizAttemptSchema);
const ModuleProgress = model('ModuleProgress', moduleProgressSchema);

module.exports = { TrainingModule, QuizAttempt, ModuleProgress };
