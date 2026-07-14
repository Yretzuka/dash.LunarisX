const mongoose = require('mongoose');
const { ROLES } = require('../config/rbac');

const userSchema = new mongoose.Schema(
  {
    // At least one identity provider is required; both may be linked.
    discordId: { type: String, unique: true, sparse: true, index: true },
    googleId: { type: String, unique: true, sparse: true, index: true },

    username: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    avatarUrl: { type: String },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },

    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date, default: null },

    // Key System (currently "Coming Soon" on the frontend — model kept
    // ready so the feature can be turned back on without a migration).
    currentKey: { type: String, default: null },
    keyExpiresAt: { type: Date, default: null },

    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },

    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
