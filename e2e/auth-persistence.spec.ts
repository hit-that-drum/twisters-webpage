import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const APP_USER = {
  id: 101,
  name: 'TEST_MEMBER',
  email: 'twistersMember@gmail.com',
  profileImage: null,
  isAdmin: false,
  isTest: true,
};

const AUTH_KEYS = {
  accessToken: 'token',
  refreshToken: 'refreshToken',
  persistedMeInfo: 'twistersPersistedAuthMeInfo',
  persistedStore: 'twisters-auth-store',
  sessionSnapshot: 'twistersEphemeralAuthSnapshot',
} as const;

interface MockAuthState {
  accessToken: string;
  refreshToken: string;
}

const createMockAuthState = (): MockAuthState => ({
  accessToken: 'access-token-initial',
  refreshToken: 'refresh-token-initial',
});

const mockAuthEndpoints = async (context: BrowserContext, authState: MockAuthState) => {
  await context.route('**/authentication/signin', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: authState.accessToken,
        refreshToken: authState.refreshToken,
        userId: APP_USER.id,
      }),
    });
  });

  await context.route('**/authentication/me', async (route) => {
    const authorization = route.request().headers().authorization;
    if (authorization !== `Bearer ${authState.accessToken}`) {
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
      body: JSON.stringify(APP_USER),
    });
  });

  await context.route('**/authentication/refresh', async (route) => {
    const requestBody = route.request().postDataJSON() as { refreshToken?: string } | null;
    if (requestBody?.refreshToken !== authState.refreshToken) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid refresh token' }),
      });
      return;
    }

    authState.accessToken = `${authState.accessToken}-rotated`;
    authState.refreshToken = `${authState.refreshToken}-rotated`;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: authState.accessToken,
        refreshToken: authState.refreshToken,
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
};

const loginThroughUi = async (page: Page, rememberMe: boolean) => {
  await page.goto('/signin');
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  await page.locator('#email').fill(APP_USER.email);
  await page.locator('#password').fill('twister-member-test');

  const rememberCheckbox = page.locator('#remember');
  if (rememberMe) {
    await rememberCheckbox.check();
  } else {
    await rememberCheckbox.uncheck();
  }

  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${APP_USER.id}$`));
  await expect(page.getByText(`User ID: ${APP_USER.id}`)).toBeVisible();
};

const readAuthStorage = async (page: Page) => {
  return page.evaluate(({ keys }) => {
    const readSessionSnapshot = () => {
      const rawValue = window.sessionStorage.getItem(keys.sessionSnapshot);
      return rawValue ? JSON.parse(rawValue) : null;
    };

    const readPersistedStore = () => {
      const rawValue = window.localStorage.getItem(keys.persistedStore);
      return rawValue ? JSON.parse(rawValue) : null;
    };

    const readPersistedMeInfo = () => {
      const rawValue = window.localStorage.getItem(keys.persistedMeInfo);
      return rawValue ? JSON.parse(rawValue) : null;
    };

    return {
      localAccessToken: window.localStorage.getItem(keys.accessToken),
      localRefreshToken: window.localStorage.getItem(keys.refreshToken),
      persistedStore: readPersistedStore(),
      persistedMeInfo: readPersistedMeInfo(),
      sessionSnapshot: readSessionSnapshot(),
    };
  }, { keys: AUTH_KEYS });
};

test.describe('auth persistence', () => {
  test('rememberMe=false keeps session across a new tab in the same browser session', async ({ browser }) => {
    const authState = createMockAuthState();
    const context = await browser.newContext();
    await mockAuthEndpoints(context, authState);

    const firstPage = await context.newPage();
    await loginThroughUi(firstPage, false);

    const firstStorage = await readAuthStorage(firstPage);
    expect(firstStorage.localAccessToken).toBeNull();
    expect(firstStorage.localRefreshToken).toBeNull();
    expect(firstStorage.persistedMeInfo).toBeNull();
    expect(firstStorage.persistedStore?.state?.session ?? null).toBeNull();
    expect(firstStorage.sessionSnapshot?.session.rememberMe).toBe(false);
    expect(firstStorage.sessionSnapshot?.session.accessToken).toBe(authState.accessToken);

    const secondPage = await context.newPage();
    await secondPage.goto('/');
    await expect(secondPage).toHaveURL(new RegExp(`/${APP_USER.id}$`));
    await expect(secondPage.getByText(`User ID: ${APP_USER.id}`)).toBeVisible();

    const secondStorage = await readAuthStorage(secondPage);
    expect(secondStorage.localAccessToken).toBeNull();
    expect(secondStorage.localRefreshToken).toBeNull();
    expect(secondStorage.persistedMeInfo).toBeNull();
    expect(secondStorage.persistedStore?.state?.session ?? null).toBeNull();
    expect(secondStorage.sessionSnapshot?.session.rememberMe).toBe(false);
    expect(secondStorage.sessionSnapshot?.session.refreshToken).toBe(authState.refreshToken);

    await context.close();
  });

  test('rememberMe=false expires after browser relaunch', async ({ browser }) => {
    const authState = createMockAuthState();
    const firstContext = await browser.newContext();
    await mockAuthEndpoints(firstContext, authState);

    const firstPage = await firstContext.newPage();
    await loginThroughUi(firstPage, false);
    const storageState = await firstContext.storageState();
    await firstContext.close();

    const relaunchedContext = await browser.newContext({ storageState });
    await mockAuthEndpoints(relaunchedContext, authState);

    const relaunchedPage = await relaunchedContext.newPage();
    await relaunchedPage.goto('/');
    await expect(relaunchedPage).toHaveURL(/\/signup$/);

    const relaunchedStorage = await readAuthStorage(relaunchedPage);
    expect(relaunchedStorage.localAccessToken).toBeNull();
    expect(relaunchedStorage.localRefreshToken).toBeNull();
    expect(relaunchedStorage.persistedMeInfo).toBeNull();
    expect(relaunchedStorage.persistedStore?.state?.session ?? null).toBeNull();
    expect(relaunchedStorage.sessionSnapshot).toBeNull();

    await relaunchedContext.close();
  });

  test('rememberMe=true persists across browser relaunch', async ({ browser }) => {
    const authState = createMockAuthState();
    const firstContext = await browser.newContext();
    await mockAuthEndpoints(firstContext, authState);

    const firstPage = await firstContext.newPage();
    await loginThroughUi(firstPage, true);

    const rememberedStorage = await readAuthStorage(firstPage);
    expect(rememberedStorage.localAccessToken).toBe(authState.accessToken);
    expect(rememberedStorage.localRefreshToken).toBe(authState.refreshToken);
    expect(rememberedStorage.persistedMeInfo?.id).toBe(APP_USER.id);
    expect(rememberedStorage.persistedStore?.state?.rememberMe).toBe(true);
    expect(rememberedStorage.persistedStore?.state?.session?.rememberMe).toBe(true);
    expect(rememberedStorage.persistedStore?.state?.session?.accessToken).toBe(authState.accessToken);
    expect(rememberedStorage.sessionSnapshot).toBeNull();

    const storageState = await firstContext.storageState();
    await firstContext.close();

    const relaunchedContext = await browser.newContext({ storageState });
    await mockAuthEndpoints(relaunchedContext, authState);

    const relaunchedPage = await relaunchedContext.newPage();
    await relaunchedPage.goto('/');
    await expect(relaunchedPage).toHaveURL(new RegExp(`/${APP_USER.id}$`));
    await expect(relaunchedPage.getByText(`User ID: ${APP_USER.id}`)).toBeVisible();

    const relaunchedStorage = await readAuthStorage(relaunchedPage);
    expect(relaunchedStorage.localAccessToken).toBe(authState.accessToken);
    expect(relaunchedStorage.localRefreshToken).toBe(authState.refreshToken);
    expect(relaunchedStorage.persistedMeInfo?.email).toBe(APP_USER.email);
    expect(relaunchedStorage.persistedStore?.state?.rememberMe).toBe(true);
    expect(relaunchedStorage.persistedStore?.state?.session?.refreshToken).toBe(authState.refreshToken);
    expect(relaunchedStorage.sessionSnapshot).toBeNull();

    await relaunchedContext.close();
  });
});
