export interface LocalAuthUser {
  id: number;
  name: string;
  email: string;
}

export interface PendingSignUpResponse {
  message: string;
  status: 'pending';
  userId: number;
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
}

export interface PendingUserRow {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface UserApprovalRow {
  id: number;
  isAllowed: boolean | number;
}

export interface ManagedUserRow {
  id: number;
  isAdmin: boolean | number;
  isAllowed: boolean | number;
}

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean | number;
  isAllowed: boolean | number;
  createdAt: Date;
}

export interface UserEmailRow {
  id: number;
  email: string;
}

export interface PasswordResetLookupRow {
  id: number;
  user_id: number;
  expires_at: Date;
  used_at: Date | null;
  email: string;
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
