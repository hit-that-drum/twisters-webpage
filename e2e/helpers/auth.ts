import { expect, type BrowserContext, type Page, type Route } from '@playwright/test';
import { ALL_ACCOUNTS, type MockAccount } from './accounts';

interface JsonResponseOptions {
  status?: number;
  body?: unknown;
}

interface MockAuthServerOptions {
  accounts?: MockAccount[];
  onSignin?: (route: Route, accounts: MockAccount[]) => Promise<JsonResponseOptions | null>;
  onSignup?: (route: Route, accounts: MockAccount[]) => Promise<JsonResponseOptions | null>;
  onRequestReset?: (route: Route) => Promise<JsonResponseOptions | null>;
  onVerifyResetToken?: (route: Route) => Promise<JsonResponseOptions | null>;
  onResetPassword?: (route: Route) => Promise<JsonResponseOptions | null>;
}

const jsonResponse = async (route: Route, { status = 200, body = {} }: JsonResponseOptions) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

const findAccountByEmail = (accounts: MockAccount[], email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  return accounts.find((account) => account.email.toLowerCase() === normalizedEmail) ?? null;
};

const findAccountByAuthorizationHeader = (
  accounts: MockAccount[],
  authorizationHeader: string | undefined,
) => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.replace('Bearer ', '').trim();
  return accounts.find((account) => account.token === token) ?? null;
};

export const installMockAuthServer = async (
  context: BrowserContext,
  options: MockAuthServerOptions = {},
) => {
  const accounts = options.accounts ?? ALL_ACCOUNTS;

  await context.route('**/authentication/signin', async (route) => {
    if (options.onSignin) {
      const customResponse = await options.onSignin(route, accounts);
      if (customResponse) {
        await jsonResponse(route, customResponse);
        return;
      }
    }

    const payload = route.request().postDataJSON() as { email?: string; password?: string } | null;
    const email = typeof payload?.email === 'string' ? payload.email : '';
    const password = typeof payload?.password === 'string' ? payload.password : '';

    const account = findAccountByEmail(accounts, email);
    if (!account || account.password !== password) {
      await jsonResponse(route, {
        status: 401,
        body: { error: 'Invalid credentials' },
      });
      return;
    }

    await jsonResponse(route, {
      body: {
        token: account.token,
        refreshToken: account.refreshToken,
        userId: account.id,
      },
    });
  });

  await context.route('**/authentication/signup', async (route) => {
    if (options.onSignup) {
      const customResponse = await options.onSignup(route, accounts);
      if (customResponse) {
        await jsonResponse(route, customResponse);
        return;
      }
    }

    const payload = route.request().postDataJSON() as { name?: string; email?: string } | null;
    const name = typeof payload?.name === 'string' ? payload.name.trim() : 'NEW_USER';
    const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const createdId = 999;

    await jsonResponse(route, {
      status: 201,
      body: {
        token: `signup-token-${createdId}`,
        refreshToken: `signup-refresh-${createdId}`,
        userId: createdId,
        user: { id: createdId, name, email },
      },
    });
  });

  await context.route('**/authentication/request-reset', async (route) => {
    if (options.onRequestReset) {
      const customResponse = await options.onRequestReset(route);
      if (customResponse) {
        await jsonResponse(route, customResponse);
        return;
      }
    }

    await jsonResponse(route, {
      body: { message: '비밀번호 재설정 링크를 이메일로 보냈습니다.' },
    });
  });

  await context.route('**/authentication/verify-reset-token', async (route) => {
    if (options.onVerifyResetToken) {
      const customResponse = await options.onVerifyResetToken(route);
      if (customResponse) {
        await jsonResponse(route, customResponse);
        return;
      }
    }

    await jsonResponse(route, { body: { valid: true } });
  });

  await context.route('**/authentication/reset-password', async (route) => {
    if (options.onResetPassword) {
      const customResponse = await options.onResetPassword(route);
      if (customResponse) {
        await jsonResponse(route, customResponse);
        return;
      }
    }

    await jsonResponse(route, { body: { message: '비밀번호가 성공적으로 변경되었습니다.' } });
  });

  await context.route('**/authentication/me', async (route) => {
    const account = findAccountByAuthorizationHeader(accounts, route.request().headers().authorization);
    if (!account) {
      await jsonResponse(route, {
        status: 401,
        body: { error: 'Unauthorized' },
      });
      return;
    }

    await jsonResponse(route, {
      body: {
        id: account.id,
        name: account.name,
        email: account.email,
        profileImage: account.profileImage,
        isAdmin: account.isAdmin,
        isTest: account.isTest,
      },
    });
  });

  await context.route('**/authentication/refresh', async (route) => {
    const payload = route.request().postDataJSON() as { refreshToken?: string } | null;
    const refreshToken = typeof payload?.refreshToken === 'string' ? payload.refreshToken : '';
    const account = accounts.find((candidate) => candidate.refreshToken === refreshToken) ?? null;

    if (!account) {
      await jsonResponse(route, {
        status: 401,
        body: { error: 'Invalid refresh token' },
      });
      return;
    }

    await jsonResponse(route, {
      body: {
        token: account.token,
        refreshToken: account.refreshToken,
      },
    });
  });

  await context.route('**/authentication/heartbeat', async (route) => {
    await jsonResponse(route, { body: { ok: true } });
  });

  await context.route('**/authentication/logout', async (route) => {
    await jsonResponse(route, { body: { message: 'Logged out' } });
  });
};

export const signInThroughUi = async (
  page: Page,
  account: MockAccount,
  options: { rememberMe?: boolean } = {},
) => {
  await page.goto('/signin');
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);

  const rememberCheckbox = page.locator('#remember');
  if (options.rememberMe) {
    await rememberCheckbox.check();
  } else {
    await rememberCheckbox.uncheck();
  }

  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${account.id}$`));
};

export const seedRememberedAuthSession = async (page: Page, account: MockAccount) => {
  await page.goto('/signin');
  await page.evaluate((seedAccount) => {
    const meInfo = {
      id: seedAccount.id,
      name: seedAccount.name,
      email: seedAccount.email,
      profileImage: seedAccount.profileImage,
      isAdmin: seedAccount.isAdmin,
      isTest: seedAccount.isTest,
    };

    localStorage.setItem('token', seedAccount.token);
    localStorage.setItem('refreshToken', seedAccount.refreshToken);
    localStorage.setItem('twistersPersistedAuthMeInfo', JSON.stringify(meInfo));
    localStorage.setItem(
      'twisters-auth-store',
      JSON.stringify({
        state: {
          session: {
            accessToken: seedAccount.token,
            refreshToken: seedAccount.refreshToken,
            rememberMe: true,
          },
          meInfo,
          rememberMe: true,
          isAuthenticated: true,
          hasAuthSession: true,
        },
        version: 0,
      }),
    );
  }, account);
};
