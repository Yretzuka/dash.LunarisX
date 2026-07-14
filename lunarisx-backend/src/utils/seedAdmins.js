/**
 * Optional: pre-creates placeholder User documents for each configured
 * super admin Discord ID, so they show up in /api/admin/users even
 * before their first login. Not required — logging in via Discord
 * auto-promotes them regardless (see authController.upsertUserFromDiscord).
 *
 * Run with: npm run seed:admins
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { ROLES, getSuperAdminDiscordIds } = require('../config/rbac');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const ids = getSuperAdminDiscordIds();
  if (ids.length === 0) {
    console.log('No SUPER_ADMIN_DISCORD_IDS configured in .env — nothing to seed.');
    process.exit(0);
  }

  for (const discordId of ids) {
    const existing = await User.findOne({ discordId });
    if (existing) {
      console.log(`Already exists: ${discordId} (role: ${existing.role})`);
      continue;
    }
    const placeholder = await User.create({
      discordId,
      username: `pending_admin_${discordId.slice(-4)}`,
      role: ROLES.SUPER_ADMIN,
    });
    console.log(`Seeded placeholder super admin: ${placeholder.username} (${discordId})`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
