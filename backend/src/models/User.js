const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  name:         { type: String, trim: true },
  phone:        { type: String, unique: true, sparse: true },
  email:        { type: String, unique: true, sparse: true, lowercase: true },
  passwordHash: { type: String },
  role:         { type: String, enum: ['citizen','authority','admin','worker'], default: 'citizen' },
  wardId:       { type: Schema.Types.ObjectId, ref: 'Ward' },
  isVerified:   { type: Boolean, default: false },
  otpSecret:    { type: String },
  otpExpiresAt: { type: Date },
  fcmToken:     { type: String },
  avatarUrl:    { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
}, { timestamps: true });

userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

module.exports = model('User', userSchema);
