const mongoose = require('mongoose');

const keySchema = new mongoose.Schema(
  {
    value: { type: String, required: true, unique: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isRedeemed: { type: Boolean, default: false },
    redeemedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Key', keySchema);
