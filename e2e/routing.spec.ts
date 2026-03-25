import { expect, test } from '@playwright/test';
import { TEST_MEMBER } from './helpers/accounts';
import { installMockAuthServer, signInThroughUi } from './helpers/auth';

test.describe('routing', () => {
  test('root redirect sends unauthenticated users to signup', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole('button', { name: '회원가입', exact: true })).toBeVisible();
  });

  test('protected route sends unauthenticated users to signin', async ({ page }) => {
    await page.goto('/board');
    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  });

  test('authenticated users redirect to their user page and can logout from the header menu', async ({ browser }) => {
    const context = await browser.newContext();
    await installMockAuthServer(context);
    await context.route('**/board', async (route) => {
      if (route.request().isNavigationRequest()) {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    const page = await context.newPage();
    await signInThroughUi(page, TEST_MEMBER);

    await page.goto('/');
    await expect(page).toHaveURL(new RegExp(`/${TEST_MEMBER.id}$`));
    await expect(page.getByText(`User ID: ${TEST_MEMBER.id}`)).toBeVisible();

    await page.goto('/board');
    await expect(page.getByRole('heading', { name: 'BOARD' })).toBeVisible();
    await expect(page.getByText('등록된 게시글이 없습니다.')).toBeVisible();

    await page.getByRole('button', { name: 'Open account menu' }).click();
    await page.getByRole('menuitem', { name: '☑️ Logout' }).click();
    await expect(page).toHaveURL(/\/signin$/);

    await context.close();
  });
});
