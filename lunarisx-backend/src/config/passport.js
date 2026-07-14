const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { upsertUserFromDiscord, upsertUserFromGoogle } = require('../controllers/authController');

function configurePassport() {
  // We use JWT cookies for session state, not passport sessions —
  // req.user is only populated for the duration of the OAuth callback.
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  passport.use(
    new DiscordStrategy(
      {
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK_URL,
        scope: ['identify', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await upsertUserFromDiscord(profile);
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await upsertUserFromGoogle(profile);
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  return passport;
}

module.exports = configurePassport;
