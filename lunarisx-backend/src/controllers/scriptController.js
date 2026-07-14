const ScriptUpdate = require('../models/ScriptUpdate');
const { recordAudit } = require('../utils/audit');

/** GET /api/scripts/updates — public, newest first */
async function listUpdates(req, res, next) {
  try {
    const updates = await ScriptUpdate.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .limit(50);
    res.json(updates);
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/scripts — admin only */
async function createUpdate(req, res, next) {
  try {
    const { version, title, notes, isPublished } = req.body;
    const update = await ScriptUpdate.create({
      version,
      title,
      notes,
      isPublished: isPublished ?? true,
      createdBy: req.user._id,
    });

    await recordAudit({
      actor: req.user._id,
      actorLabel: req.user.username,
      action: 'script_update.created',
      target: update._id.toString(),
      metadata: { version },
      ip: req.ip,
    });

    res.status(201).json(update);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/admin/scripts/:id — admin only */
async function updateUpdate(req, res, next) {
  try {
    const update = await ScriptUpdate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!update) return res.status(404).json({ error: 'Update not found.' });

    await recordAudit({
      actor: req.user._id,
      actorLabel: req.user.username,
      action: 'script_update.edited',
      target: update._id.toString(),
      ip: req.ip,
    });

    res.json(update);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/scripts/:id — admin only */
async function deleteUpdate(req, res, next) {
  try {
    const update = await ScriptUpdate.findByIdAndDelete(req.params.id);
    if (!update) return res.status(404).json({ error: 'Update not found.' });

    await recordAudit({
      actor: req.user._id,
      actorLabel: req.user.username,
      action: 'script_update.deleted',
      target: req.params.id,
      ip: req.ip,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUpdates, createUpdate, updateUpdate, deleteUpdate };
