import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import { getJwtSecret } from '../authUtils.js';

// --- 1. LOCAL STRATEGY (For Logging In) ---
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];
        if (!user) return done(null, false, { message: 'Incorrect email.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: 'Incorrect password.' });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// --- 2. JWT STRATEGY (For Protecting Routes) ---
const jwtOptions = {
  // Look for the token in the 'Authorization: Bearer <TOKEN>' header
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: getJwtSecret(),
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      // jwtPayload contains the data we signed: { id, email }
      const [rows]: any = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [
        jwtPayload.id,
      ]);
      const user = rows[0];

      if (user) {
        return done(null, user); // Success: req.user is now populated
      } else {
        return done(null, false); // Fail: User no longer exists
      }
    } catch (err) {
      return done(err, false);
    }
  }),
);

export default passport;
