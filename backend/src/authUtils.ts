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

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return secret;
};

export const createAccessToken = (payload: JwtPayload) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1h' });
};

export const buildAuthResponse = (user: AuthUser, message: string) => {
  return {
    message,
    token: createAccessToken({ id: user.id, email: user.email }),
    userId: user.id,
    user: {
      id: user.id,
      name: user.name,
    },
  };
};
