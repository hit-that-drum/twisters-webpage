export interface MockAccount {
  id: number;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  isTest: boolean;
  token: string;
  refreshToken: string;
  profileImage: string | null;
}

export const TEST_ADMIN: MockAccount = {
  id: 601,
  name: 'TEST_ADMIN',
  email: 'twistersAdmin@gmail.com',
  password: 'twisters-admin-test',
  isAdmin: true,
  isTest: true,
  token: 'token-test-admin',
  refreshToken: 'refresh-test-admin',
  profileImage: null,
};

export const TEST_MEMBER: MockAccount = {
  id: 603,
  name: 'TEST_MEMBER',
  email: 'twistersMember@gmail.com',
  password: 'twister-member-test',
  isAdmin: false,
  isTest: true,
  token: 'token-test-member',
  refreshToken: 'refresh-test-member',
  profileImage: null,
};

export const MEMBER_NORMAL: MockAccount = {
  id: 604,
  name: 'MEMBER_NORMAL',
  email: 'member.normal@example.com',
  password: 'normal-member-test',
  isAdmin: false,
  isTest: false,
  token: 'token-normal-member',
  refreshToken: 'refresh-normal-member',
  profileImage: null,
};

export const ALL_ACCOUNTS: MockAccount[] = [TEST_ADMIN, TEST_MEMBER, MEMBER_NORMAL];
