const mongoose = require('mongoose');

const scriptUpdateSchema = new mongoose.Schema(
  {
    version: { type: String, required: true, trim: true },
    title: { type: String, trim: true, default: '' },
    notes: [{ type: String, trim: true }],
    publishedAt: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

scriptUpdateSchema.index({ publishedAt: -1 });

module.exports = mongoose.model('ScriptUpdate', scriptUpdateSchema);
