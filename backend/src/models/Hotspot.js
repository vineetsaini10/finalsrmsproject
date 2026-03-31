const { Schema, model } = require('mongoose');

const hotspotSchema = new Schema({
  wardId:         { type: Schema.Types.ObjectId, ref: 'Ward' },
  centroid: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  complaintCount: { type: Number },
  severityScore:  { type: Number },
  level:          { type: String, enum: ['critical','high','medium','low'], default: 'low' },
  trend:          { type: String, enum: ['increasing','stable','decreasing'], default: 'stable' },
  dominantType:   { type: String },
  peakTime:       { type: String },
  predictedCount: { type: Number },
  recommendedAction: { type: String },
  periodDays:     { type: Number, default: 7 },
}, { timestamps: true });

hotspotSchema.index({ wardId: 1, createdAt: -1 });
hotspotSchema.index({ centroid: '2dsphere' });
hotspotSchema.index({ level: 1 });

module.exports = model('Hotspot', hotspotSchema);
