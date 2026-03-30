import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { getJwtSecret } from '../authUtils.js';
import { HttpError } from '../errors/httpError.js';
import { getAuthenticatedUserBySession, touchSessionActivity } from '../sessionService.js';

interface AccessJwtPayload {
  id?: unknown;
  sessionId?: unknown;
}

const parseJwtNumericId = (rawValue: unknown) => {
  if (typeof rawValue === 'number' && Number.isSafeInteger(rawValue) && rawValue > 0) {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    const parsed = Number(rawValue);
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
};

interface PassportUserRow {
  id: number;
  name: string;
  email: string;
  password: string | null;
  isAdmin: boolean | null;
  isAllowed: boolean | null;
  sessionId?: number;
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
          'SELECT id, name, email, password, "isAdmin", "isAllowed" FROM users WHERE LOWER(email) = LOWER($1)',
          [email],
        );
        const user = result.rows[0];
        if (!user) return done(null, false, { message: 'Incorrect email.' });

        if (!user.password) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: 'Incorrect password.' });

        if (user.isAllowed !== true) {
          return done(new HttpError(403, '관리자 승인 대기 중입니다.', 'ACCOUNT_PENDING_APPROVAL'));
        }

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
  new JwtStrategy(jwtOptions, async (jwtPayload: AccessJwtPayload, done) => {
    try {
      const userId = parseJwtNumericId(jwtPayload.id);
      const sessionId = parseJwtNumericId(jwtPayload.sessionId);

      if (!userId || !sessionId) {
        return done(null, false);
      }

      const user = await getAuthenticatedUserBySession(userId, sessionId);

      if (!user) {
        return done(null, false);
      }

      try {
        await touchSessionActivity(sessionId);
      } catch (touchError) {
        console.error('Session activity touch failed:', touchError);
      }

      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }),
);

export default passport;
