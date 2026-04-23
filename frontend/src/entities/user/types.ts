/**
 * User-shape types shared across pages.
 *
 * The backend exposes several user-related endpoints that return
 * overlapping-but-distinct shapes:
 *  - the signed-in user's self profile (MeInfo, UserSummary)
 *  - the member directory (MemberUser)
 *  - the admin-console pending-approval list (PendingUserRecord)
 *  - the admin-console full user list (AdminUserRecord)
 *
 * Each shape is kept separate because they come from different endpoints
 * with different optional-field contracts; consolidating them here is the
 * single source of truth for those shapes.
 */

export interface MeInfo {
  id: number;
  name: string;
  email: string;
  profileImage: string | null;
  isAdmin: boolean;
  isTest: boolean;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
}

/** Row shape returned by the member-directory endpoint. */
export interface MemberUser {
  id: number;
  name: string;
  email: string | null;
  profileImage: string | null;
  isAdmin: boolean;
  phone: string | null;
  joinedAt: string | null;
  birthDate: string | null;
}

/** Signed-up-but-not-yet-approved user in the admin console. */
export interface PendingUserRecord {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
}

/** Full admin-console user row, including approval + role flags. */
export interface AdminUserRecord {
  id: number;
  name: string;
  email: string;
  profileImage: string | null;
  isAdmin: boolean;
  isAllowed: boolean;
  createdAt: string;
  emailVerifiedAt: string | null;
  phone?: string | null;
  department?: string | null;
  joinedAt?: string | null;
}
