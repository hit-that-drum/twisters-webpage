export interface LocalAuthUser {
  id: number;
  name: string;
  email: string;
}

export interface PendingSignUpResponse {
  message: string;
  status: 'pending';
  userId: number;
  devVerificationLink?: string;
}

export interface SignUpDTO {
  name?: string;
  email?: string;
  password?: string;
}

export interface AdminUserMutationDTO {
  name?: unknown;
  email?: unknown;
  isAdmin?: unknown;
  isAllowed?: unknown;
}

export interface MeUser {
  id: number;
  name: string;
  email: string;
  profileImage: string | null;
  isAdmin: boolean;
  isTest: boolean;
}

export interface PublicUserRow {
  id: number;
  name: string;
  email: string;
}

export interface MeUserRow {
  id: number;
  name: string;
  email: string;
  profileImage: string | null;
  isAdmin: boolean | number;
  isTest: boolean | number;
}

export interface ApprovalUserRow {
  id: number;
  name: string;
  email: string;
  isAllowed: boolean | number;
  emailVerifiedAt: Date | null;
}

export interface PendingUserRow {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  emailVerifiedAt: Date | null;
}

export interface UserApprovalRow {
  id: number;
  name: string;
  isTest: boolean | number;
  isAllowed: boolean | number;
}

export interface ManagedUserRow {
  id: number;
  name: string;
  isTest: boolean | number;
  isAdmin: boolean | number;
  isAllowed: boolean | number;
}

export type AdminAuthProvider = 'email' | 'google' | 'kakao';

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  profileImage: string | null;
  isAdmin: boolean | number;
  isAllowed: boolean | number;
  createdAt: Date;
  emailVerifiedAt: Date | null;
  hasGoogleAuth: boolean | number;
  hasKakaoAuth: boolean | number;
}

export interface UserEmailRow {
  id: number;
  email: string;
  emailVerifiedAt: Date | null;
}

export interface PasswordResetLookupRow {
  id: number;
  user_id: number;
  expires_at: Date;
  used_at: Date | null;
  email: string;
}

export interface EmailVerificationLookupRow {
  id: number;
  user_id: number;
  expires_at: Date;
  used_at: Date | null;
  email: string;
  email_verified_at: Date | null;
}

export interface ResetPasswordDTO {
  email?: string;
  newPassword?: string;
  token?: string;
}

export interface RequestResetDTO {
  email?: string;
}

export interface VerifyResetTokenDTO {
  email?: string;
  token?: string;
}

export interface VerifyEmailDTO {
  email?: string;
  token?: string;
}

export interface ResendVerificationEmailDTO {
  email?: string;
}

export interface GoogleAuthDTO {
  token?: string;
}

export interface KakaoAuthDTO {
  code?: string;
  redirectUri?: string;
}

export interface RefreshSessionDTO {
  refreshToken?: unknown;
}

export interface UpdateProfileImageDTO {
  profileImage?: unknown;
}
