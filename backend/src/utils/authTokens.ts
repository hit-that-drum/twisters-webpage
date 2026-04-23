import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { loadEnvironment } from '../config/env.js';

loadEnvironment();

interface JwtPayload {
  id: number;
  email: string;
  sessionId: number;
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
}

type AccessTokenExpiry = '15m' | '1h' | '30d';

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return secret;
};

export const createAccessToken = (payload: JwtPayload, expiresIn: AccessTokenExpiry = '15m') => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const buildUserResponse = (user: AuthUser) => ({
  userId: user.id,
  user: {
    id: user.id,
    name: user.name,
  },
});

export const createRefreshToken = () => crypto.randomBytes(48).toString('base64url');

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
