import { type Request } from 'express';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean | number | string;
  isTest?: boolean | number | string;
  sessionId?: number;
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
