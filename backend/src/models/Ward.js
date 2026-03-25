const { Schema, model } = require('mongoose');

const wardSchema = new Schema({
  name:     { type: String, required: true },
  ulbCode:  { type: String, required: true },
  city:     { type: String, required: true },
  state:    { type: String, required: true },
  boundary: {
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: [[[Number]]], default: undefined },
  },
}, { timestamps: true });

wardSchema.index({ city: 1 });
wardSchema.index({ boundary: '2dsphere' });

module.exports = model('Ward', wardSchema);
