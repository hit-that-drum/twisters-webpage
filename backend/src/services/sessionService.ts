import {
  ensureSessionSchema,
  findSessionByRefreshTokenHash,
  findUserBySessionId,
  insertSession,
  revokeSession,
  rotateSessionRefreshToken,
  updateSessionActivityForce,
  updateSessionActivityIfStale,
} from '../repositories/sessionRepository.js';
import {
  buildUserResponse,
  createAccessToken,
  createRefreshToken,
  hashToken,
} from '../utils/authTokens.js';
import {
  SESSION_ABSOLUTE_TIMEOUT_DAYS,
  SESSION_ABSOLUTE_TIMEOUT_REMEMBER_DAYS,
  SESSION_ACTIVITY_TOUCH_THRESHOLD_SECONDS,
  SESSION_IDLE_TIMEOUT_MINUTES,
  isSessionExpired,
  parseNumericId,
} from './session/sessionConfig.js';

interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export const createSessionAuthResponse = async (user: AuthUser, message: string, rememberMe = false) => {
  await ensureSessionSchema();

  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const absoluteTimeoutDays = rememberMe
    ? SESSION_ABSOLUTE_TIMEOUT_REMEMBER_DAYS
    : SESSION_ABSOLUTE_TIMEOUT_DAYS;

  const createdSessionId = await insertSession({
    userId: user.id,
    refreshTokenHash,
    rememberMe,
    idleTimeoutMinutes: SESSION_IDLE_TIMEOUT_MINUTES,
    absoluteTimeoutDays,
  });

  if (!createdSessionId) {
    throw new Error('Failed to create user session.');
  }

  const sessionId = parseNumericId(createdSessionId, 'sessionId');

  return {
    message,
    token: createAccessToken({ id: user.id, email: user.email, sessionId }),
    refreshToken,
    ...buildUserResponse(user),
  };
};

export const refreshSessionAuthResponse = async (refreshToken: string) => {
  await ensureSessionSchema();

  const refreshTokenHash = hashToken(refreshToken);
  const session = await findSessionByRefreshTokenHash(refreshTokenHash);
  if (!session) {
    return null;
  }

  const sessionId = parseNumericId(session.id, 'sessionId');

  if (isSessionExpired(new Date(session.idle_expires_at), new Date(session.absolute_expires_at))) {
    await revokeSessionById(sessionId);
    return null;
  }

  const nextRefreshToken = createRefreshToken();
  const nextRefreshTokenHash = hashToken(nextRefreshToken);

  await rotateSessionRefreshToken(sessionId, nextRefreshTokenHash, SESSION_IDLE_TIMEOUT_MINUTES);

  return {
    message: '토큰이 갱신되었습니다.',
    token: createAccessToken({ id: session.user_id, email: session.email, sessionId }),
    refreshToken: nextRefreshToken,
    ...buildUserResponse({
      id: session.user_id,
      name: session.name,
      email: session.email,
    }),
  };
};

export const getAuthenticatedUserBySession = async (userId: number, sessionId: number) => {
  await ensureSessionSchema();

  const user = await findUserBySessionId(userId, sessionId);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
    isTest: Boolean(user.isTest),
    sessionId,
  };
};

export const touchSessionActivity = async (sessionId: number, force = false) => {
  await ensureSessionSchema();

  if (force) {
    await updateSessionActivityForce(sessionId, SESSION_IDLE_TIMEOUT_MINUTES);
    return;
  }

  await updateSessionActivityIfStale(
    sessionId,
    SESSION_IDLE_TIMEOUT_MINUTES,
    SESSION_ACTIVITY_TOUCH_THRESHOLD_SECONDS,
  );
};

export const revokeSessionById = async (sessionId: number) => {
  await ensureSessionSchema();
  await revokeSession(sessionId);
};
