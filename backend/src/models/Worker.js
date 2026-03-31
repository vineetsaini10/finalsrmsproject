const { Schema, model } = require('mongoose');

const workerSchema = new Schema({
  userId:         { type: Schema.Types.ObjectId, ref: 'User' },
  name:           { type: String, required: true },
  phone:          { type: String },
  employeeId:     { type: String },
  zone:           { type: String },
  role:           { type: String, enum: ['driver','cleaner','supervisor'], default: 'cleaner' },
  wardId:         { type: Schema.Types.ObjectId, ref: 'Ward' },
  status:         { type: String, enum: ['available','busy','break','offline'], default: 'available' },
  currentLocation:{
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  assignedTasks:  [{ type: Schema.Types.ObjectId, ref: 'Complaint' }],
  tasksCompleted: { type: Number, default: 0 },
  performanceScore: { type: Number, default: 0 },
  lastActiveAt:   { type: Date, default: Date.now },
}, { timestamps: true });

workerSchema.index({ wardId: 1 });
workerSchema.index({ status: 1 });
workerSchema.index({ currentLocation: '2dsphere' });
workerSchema.index({ role: 1 });

module.exports = model('Worker', workerSchema);
