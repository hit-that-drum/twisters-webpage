import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

interface MockAccount {
  id: number;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  isTest: boolean;
  token: string;
  refreshToken: string;
}

interface PendingUserRow {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  isAllowed: boolean;
  createdAt: string;
}

const ACCOUNTS: MockAccount[] = [
  {
    id: 601,
    name: 'TEST_ADMIN',
    email: 'twistersAdmin@gmail.com',
    password: 'twisters-admin-test',
    isAdmin: true,
    isTest: true,
    token: 'token-test-admin',
    refreshToken: 'refresh-test-admin',
  },
  {
    id: 602,
    name: 'ADMIN_NORMAL',
    email: 'admin.normal@example.com',
    password: 'normal-admin-test',
    isAdmin: true,
    isTest: false,
    token: 'token-normal-admin',
    refreshToken: 'refresh-normal-admin',
  },
  {
    id: 603,
    name: 'TEST_MEMBER',
    email: 'twistersMember@gmail.com',
    password: 'twister-member-test',
    isAdmin: false,
    isTest: true,
    token: 'token-test-member',
    refreshToken: 'refresh-test-member',
  },
  {
    id: 604,
    name: 'MEMBER_NORMAL',
    email: 'member.normal@example.com',
    password: 'normal-member-test',
    isAdmin: false,
    isTest: false,
    token: 'token-normal-member',
    refreshToken: 'refresh-normal-member',
  },
];

const ALL_USERS: AdminUserRow[] = [
  {
    id: 601,
    name: 'TEST_ADMIN',
    email: 'twistersAdmin@gmail.com',
    isAdmin: true,
    isAllowed: true,
    createdAt: '2026-03-20T12:00:00.000Z',
  },
  {
    id: 603,
    name: 'TEST_MEMBER',
    email: 'twistersMember@gmail.com',
    isAdmin: false,
    isAllowed: true,
    createdAt: '2026-03-20T12:10:00.000Z',
  },
  {
    id: 602,
    name: 'ADMIN_NORMAL',
    email: 'admin.normal@example.com',
    isAdmin: true,
    isAllowed: true,
    createdAt: '2026-03-20T12:20:00.000Z',
  },
  {
    id: 604,
    name: 'MEMBER_NORMAL',
    email: 'member.normal@example.com',
    isAdmin: false,
    isAllowed: true,
    createdAt: '2026-03-20T12:30:00.000Z',
  },
];

const BASE_PENDING_USERS: PendingUserRow[] = [
  {
    id: 801,
    name: 'TEST_PENDING_USER',
    email: 'test.pending@example.com',
    createdAt: '2026-03-21T03:10:00.000Z',
  },
  {
    id: 802,
    name: 'PENDING_NORMAL_USER',
    email: 'pending.normal@example.com',
    createdAt: '2026-03-21T03:20:00.000Z',
  },
];

const isTestPrefixedName = (name: string) => name.trim().startsWith('TEST');

const findAccountByEmail = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  return ACCOUNTS.find((account) => account.email.toLowerCase() === normalizedEmail) ?? null;
};

const findAccountByAuthorizationHeader = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.replace('Bearer ', '').trim();
  return ACCOUNTS.find((account) => account.token === token) ?? null;
};

const resolveUserIdFromAdminEndpoint = (route: Route, action: 'approve' | 'decline') => {
  const url = route.request().url();
  const matcher = new RegExp(`/authentication/admin/users/(\\d+)/${action}$`);
  const matches = url.match(matcher);
  if (!matches) {
    return null;
  }

  return Number(matches[1]);
};

interface PermissionMockServerOptions {
  testAdminReceivesMixedPendingRows?: boolean;
}

const createPermissionMockServer = async (
  context: BrowserContext,
  options: PermissionMockServerOptions = {},
) => {
  const pendingUsers = BASE_PENDING_USERS.map((user) => ({ ...user }));
  const approveCalls: number[] = [];

  await context.route('**/authentication/signin', async (route) => {
    const payload = route.request().postDataJSON() as { email?: string; password?: string } | null;
    const email = typeof payload?.email === 'string' ? payload.email : '';
    const password = typeof payload?.password === 'string' ? payload.password : '';

    const account = findAccountByEmail(email);
    if (!account || account.password !== password) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: account.token,
        refreshToken: account.refreshToken,
        userId: account.id,
      }),
    });
  });

  await context.route('**/authentication/me', async (route) => {
    const account = findAccountByAuthorizationHeader(route.request().headers().authorization);
    if (!account) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: account.id,
        name: account.name,
        email: account.email,
        profileImage: null,
        isAdmin: account.isAdmin,
        isTest: account.isTest,
      }),
    });
  });

  await context.route('**/authentication/refresh', async (route) => {
    const payload = route.request().postDataJSON() as { refreshToken?: string } | null;
    const refreshToken = typeof payload?.refreshToken === 'string' ? payload.refreshToken : '';
    const account = ACCOUNTS.find((candidate) => candidate.refreshToken === refreshToken) ?? null;

    if (!account) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid refresh token' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: account.token,
        refreshToken: account.refreshToken,
      }),
    });
  });

  await context.route('**/authentication/heartbeat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await context.route('**/authentication/logout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Logged out' }),
    });
  });

  await context.route('**/authentication/admin/pending-users', async (route) => {
    const account = findAccountByAuthorizationHeader(route.request().headers().authorization);
    if (!account) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
      return;
    }

    if (!account.isAdmin) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      });
      return;
    }

    const rows =
      account.isTest && !options.testAdminReceivesMixedPendingRows
        ? pendingUsers.filter((user) => isTestPrefixedName(user.name))
        : pendingUsers;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rows),
    });
  });

  await context.route('**/authentication/admin/users', async (route) => {
    const account = findAccountByAuthorizationHeader(route.request().headers().authorization);
    if (!account) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
      return;
    }

    if (!account.isAdmin) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      });
      return;
    }

    const rows = account.isTest ? ALL_USERS.filter((user) => isTestPrefixedName(user.name)) : ALL_USERS;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rows),
    });
  });

  await context.route('**/authentication/admin/users/*/approve', async (route) => {
    const account = findAccountByAuthorizationHeader(route.request().headers().authorization);
    if (!account) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
      return;
    }

    if (!account.isAdmin) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      });
      return;
    }

    const targetUserId = resolveUserIdFromAdminEndpoint(route, 'approve');
    if (!targetUserId) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'User not found' }),
      });
      return;
    }

    const targetPendingUser = pendingUsers.find((user) => user.id === targetUserId) ?? null;
    if (!targetPendingUser) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'User not found' }),
      });
      return;
    }

    if (account.isTest && !isTestPrefixedName(targetPendingUser.name)) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'TEST 관리자 계정은 TEST 사용자만 관리할 수 있습니다.' }),
      });
      return;
    }

    approveCalls.push(targetUserId);

    const pendingIndex = pendingUsers.findIndex((user) => user.id === targetUserId);
    if (pendingIndex >= 0) {
      pendingUsers.splice(pendingIndex, 1);
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: '사용자가 승인되었습니다.' }),
    });
  });

  await context.route('**/authentication/admin/users/*/decline', async (route) => {
    const account = findAccountByAuthorizationHeader(route.request().headers().authorization);
    if (!account) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
      return;
    }

    if (!account.isAdmin) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: '사용자 가입 요청이 거절되었습니다.' }),
    });
  });

  return {
    approveCalls,
  };
};

const signInAs = async (page: Page, account: MockAccount) => {
  await page.goto('/signin');
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${account.id}$`));
  await expect(page.getByText(`User ID: ${account.id}`)).toBeVisible();
};

const getAccount = (name: MockAccount['name']) => {
  const account = ACCOUNTS.find((candidate) => candidate.name === name);
  if (!account) {
    throw new Error(`Mock account not found: ${name}`);
  }

  return account;
};

test.describe('admin and user permissions', () => {
  test('TEST user sees TEST MODE banner', async ({ browser }) => {
    const context = await browser.newContext();
    await createPermissionMockServer(context);
    const page = await context.newPage();

    await signInAs(page, getAccount('TEST_MEMBER'));

    await expect(
      page.getByText('TEST MODE: Showing isolated TEST data for notice, member, settlement, and board.'),
    ).toBeVisible();

    await context.close();
  });

  test('normal user does not see TEST MODE banner', async ({ browser }) => {
    const context = await browser.newContext();
    await createPermissionMockServer(context);
    const page = await context.newPage();

    await signInAs(page, getAccount('MEMBER_NORMAL'));

    await expect(
      page.getByText('TEST MODE: Showing isolated TEST data for notice, member, settlement, and board.'),
    ).toHaveCount(0);

    await context.close();
  });

  test('normal user cannot access admin page', async ({ browser }) => {
    const context = await browser.newContext();
    await createPermissionMockServer(context);
    const page = await context.newPage();
    const memberAccount = getAccount('MEMBER_NORMAL');

    await signInAs(page, memberAccount);
    await page.goto('/admin');

    await expect(page).toHaveURL(new RegExp(`/${memberAccount.id}$`));
    await expect(page.getByText('ADMIN DASHBOARD')).toHaveCount(0);

    await context.close();
  });

  test('TEST admin sees only TEST-prefixed users and can approve TEST pending user', async ({ browser }) => {
    const context = await browser.newContext();
    const mockServerState = await createPermissionMockServer(context);
    const page = await context.newPage();

    await signInAs(page, getAccount('TEST_ADMIN'));
    await page.goto('/admin');

    await expect(page.getByText('ADMIN DASHBOARD')).toBeVisible();
    await expect(page.getByText('TEST_PENDING_USER')).toBeVisible();
    await expect(page.getByText('TEST_MEMBER')).toBeVisible();
    await expect(page.getByText('PENDING_NORMAL_USER')).toHaveCount(0);
    await expect(page.getByText('MEMBER_NORMAL')).toHaveCount(0);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    const testPendingRow = page
      .locator('p', { hasText: 'TEST_PENDING_USER' })
      .first()
      .locator('xpath=ancestor::div[contains(@class,"px-5") and contains(@class,"py-4")][1]');
    await testPendingRow.getByRole('button', { name: 'Approve' }).click();

    await expect.poll(() => mockServerState.approveCalls.length).toBe(1);
    await expect.poll(() => mockServerState.approveCalls[0]).toBe(801);
    await expect(page.getByText('사용자가 승인되었습니다.')).toBeVisible();

    await context.close();
  });

  test('TEST admin cannot approve non-TEST pending user even if it appears in the list', async ({ browser }) => {
    const context = await browser.newContext();
    const mockServerState = await createPermissionMockServer(context, {
      testAdminReceivesMixedPendingRows: true,
    });
    const page = await context.newPage();

    await signInAs(page, getAccount('TEST_ADMIN'));
    await page.goto('/admin');

    await expect(page.getByText('PENDING_NORMAL_USER')).toBeVisible();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    const normalPendingRow = page
      .locator('p', { hasText: 'PENDING_NORMAL_USER' })
      .first()
      .locator('xpath=ancestor::div[contains(@class,"px-5") and contains(@class,"py-4")][1]');
    await normalPendingRow.getByRole('button', { name: 'Approve' }).click();

    await expect(page.getByText('사용자 승인 실패: TEST 관리자 계정은 TEST 사용자만 관리할 수 있습니다.')).toBeVisible();
    await expect.poll(() => mockServerState.approveCalls.length).toBe(0);

    await context.close();
  });

  test('normal admin sees normal users and can approve normal pending user', async ({ browser }) => {
    const context = await browser.newContext();
    const mockServerState = await createPermissionMockServer(context);
    const page = await context.newPage();

    await signInAs(page, getAccount('ADMIN_NORMAL'));
    await page.goto('/admin');

    await expect(page.getByText('ADMIN DASHBOARD')).toBeVisible();
    await expect(page.getByText('PENDING_NORMAL_USER')).toBeVisible();
    await expect(page.getByText('TEST_MEMBER')).toBeVisible();
    await expect(page.getByText('MEMBER_NORMAL')).toBeVisible();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    const normalPendingRow = page
      .locator('p', { hasText: 'PENDING_NORMAL_USER' })
      .first()
      .locator('xpath=ancestor::div[contains(@class,"px-5") and contains(@class,"py-4")][1]');
    await normalPendingRow.getByRole('button', { name: 'Approve' }).click();

    await expect.poll(() => mockServerState.approveCalls.length).toBe(1);
    await expect.poll(() => mockServerState.approveCalls[0]).toBe(802);
    await expect(page.getByText('사용자가 승인되었습니다.')).toBeVisible();

    await context.close();
  });
});
