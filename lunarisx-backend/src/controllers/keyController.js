const crypto = require('crypto');
const Key = require('../models/Key');
const { recordAudit } = require('../utils/audit');

const KEY_TTL_MS = 24 * 60 * 60 * 1000; // 24h, matches the original frontend countdown

function generateKeyValue() {
  const seg = () => crypto.randomBytes(3).toString('hex').toUpperCase();
  return `LNRX-${seg()}-${seg()}-${seg()}`;
}

/** POST /api/keys/generate — creates a new key owned by the current user. */
async function generateKey(req, res, next) {
  try {
    if (req.user.isPremium) {
      return res.status(400).json({ error: 'Premium accounts do not need a key.' });
    }

    const key = await Key.create({
      value: generateKeyValue(),
      owner: req.user._id,
      expiresAt: new Date(Date.now() + KEY_TTL_MS),
      createdBy: req.user._id,
    });

    req.user.currentKey = key.value;
    req.user.keyExpiresAt = key.expiresAt;
    await req.user.save();

    await recordAudit({
      actor: req.user._id,
      actorLabel: req.user.username,
      action: 'key.generated',
      target: key._id.toString(),
      ip: req.ip,
    });

    res.status(201).json({ key: key.value, expiresAt: key.expiresAt });
  } catch (err) {
    next(err);
  }
}

/** POST /api/keys/redeem — body: { value } */
async function redeemKey(req, res, next) {
  try {
    const { value } = req.body;
    const key = await Key.findOne({ value, revoked: false });

    if (!key) return res.status(404).json({ error: 'Key not found or revoked.' });
    if (key.isRedeemed) return res.status(400).json({ error: 'Key already redeemed.' });
    if (key.expiresAt < new Date()) return res.status(400).json({ error: 'Key has expired.' });

    key.isRedeemed = true;
    key.redeemedAt = new Date();
    key.owner = req.user._id;
    await key.save();

    req.user.currentKey = key.value;
    req.user.keyExpiresAt = key.expiresAt;
    await req.user.save();

    await recordAudit({
      actor: req.user._id,
      actorLabel: req.user.username,
      action: 'key.redeemed',
      target: key._id.toString(),
      ip: req.ip,
    });

    res.json({ ok: true, expiresAt: key.expiresAt });
  } catch (err) {
    next(err);
  }
}

/** GET /api/keys/status */
async function keyStatus(req, res) {
  if (req.user.isPremium) {
    return res.json({ bypassed: true });
  }
  res.json({
    key: req.user.currentKey,
    expiresAt: req.user.keyExpiresAt,
    expired: req.user.keyExpiresAt ? req.user.keyExpiresAt < new Date() : true,
  });
}

module.exports = { generateKey, redeemKey, keyStatus };
