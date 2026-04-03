const { Schema, model } = require('mongoose');

const quizSchema = new Schema({
  moduleId: {
    type: Schema.Types.ObjectId,
    ref: 'TrainingModule',
    required: true,
  },
  questions: [{
    question: { type: String, required: true, trim: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: Number, required: true, min: 0 },
  }],
}, { timestamps: true });

quizSchema.index({ moduleId: 1 }, { unique: true });

module.exports = model('Quiz', quizSchema);
