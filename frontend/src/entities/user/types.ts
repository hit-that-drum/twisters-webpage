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
