import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { getJwtSecret } from '../authUtils.js';

interface PassportUserRow {
  id: number;
  name: string;
  email: string;
  password: string | null;
  isAdmin: boolean | null;
}

// --- 1. LOCAL STRATEGY (For Logging In) ---
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const result = await query<PassportUserRow>(
          'SELECT id, name, email, password, "isAdmin" FROM users WHERE email = $1',
          [email],
        );
        const user = result.rows[0];
        if (!user) return done(null, false, { message: 'Incorrect email.' });

        if (!user.password) {
          return done(null, false, { message: 'Incorrect password.' });
        }

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
      const result = await query<PassportUserRow>(
        'SELECT id, name, email, "isAdmin" FROM users WHERE id = $1',
        [jwtPayload.id],
      );
      const user = result.rows[0];

      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  }),
);

export default passport;
