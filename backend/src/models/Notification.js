const { Schema, model } = require('mongoose');

const notificationSchema = new Schema({
  userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title:   { type: String, required: true },
  body:    { type: String },
  type:    { type: String, enum: ['complaint_update','awareness','announcement','reward'] },
  data:    { type: Schema.Types.Mixed },
  isRead:  { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const refreshTokenSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token:     { type: String, unique: true, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

refreshTokenSchema.index({ token: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

const Notification   = model('Notification', notificationSchema);
const RefreshToken   = model('RefreshToken', refreshTokenSchema);

module.exports = { Notification, RefreshToken };
