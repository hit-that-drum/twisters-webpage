import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: number;
  email: string;
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface BuildAuthResponseOptions {
  rememberMe?: boolean;
}

type AccessTokenExpiry = '1h' | '30d';

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return secret;
};

export const createAccessToken = (payload: JwtPayload, expiresIn: AccessTokenExpiry = '1h') => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const buildAuthResponse = (user: AuthUser, message: string, options: BuildAuthResponseOptions = {}) => {
  const expiresIn: AccessTokenExpiry = options.rememberMe ? '30d' : '1h';

  return {
    message,
    token: createAccessToken({ id: user.id, email: user.email }, expiresIn),
    userId: user.id,
    user: {
      id: user.id,
      name: user.name,
    },
  };
};
