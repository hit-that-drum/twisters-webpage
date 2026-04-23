import { expect, test } from '@playwright/test';
import { TEST_MEMBER } from './helpers/accounts';
import { installMockAuthServer } from './helpers/auth';

test.describe('auth flows', () => {
  test('signin page renders the expected controls', async ({ page }) => {
    await page.goto('/signin');

    await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#remember')).toBeVisible();
    await expect(page.getByRole('button', { name: '비밀번호 재설정' })).toBeVisible();
    await expect(page.getByRole('button', { name: '회원가입' })).toBeVisible();
  });

  test('signup pending approval redirects back to signin with the pending message', async ({ browser }) => {
    const context = await browser.newContext();
    await installMockAuthServer(context, {
      onSignup: async () => ({
        status: 201,
        body: {
          status: 'pending',
          message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인하실 수 있습니다.',
        },
      }),
    });
    const page = await context.newPage();

    await page.goto('/signup');
    await page.locator('#name').fill('TEST_NEW_MEMBER');
    await page.locator('#email').fill('new.member@example.com');
    await page.locator('#password').fill('new-member-pass');
    await page.getByRole('button', { name: '회원가입', exact: true }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(
      page.getByText('회원가입이 완료되었습니다. 관리자 승인 후 로그인하실 수 있습니다.'),
    ).toBeVisible();

    await context.close();
  });

  test('signup can auto-apply dev verification link and finish email verification on signin', async ({ browser }) => {
    const context = await browser.newContext();
    await installMockAuthServer(context, {
      onSignup: async () => ({
        status: 201,
        body: {
          status: 'pending',
          message: '회원가입이 완료되었습니다. 이메일 인증과 관리자 승인 후 로그인하실 수 있습니다.',
          userId: 1001,
          devVerificationLink:
            'http://localhost:5173/signin?verificationToken=dev-token&verificationEmail=new.member@example.com',
        },
      }),
      onVerifyEmail: async () => ({
        status: 200,
        body: {
          message: '이메일 인증이 완료되었습니다. 관리자 승인 후 로그인해주세요.',
        },
      }),
    });
    const page = await context.newPage();

    await page.goto('/signup');
    await page.locator('#name').fill('TEST_NEW_MEMBER');
    await page.locator('#email').fill('new.member@example.com');
    await page.locator('#password').fill('new-member-pass');
    await page.getByRole('button', { name: '회원가입', exact: true }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(
      page.getByText('이메일 인증이 완료되었습니다. 관리자 승인 후 로그인해주세요.'),
    ).toBeVisible();
    await expect(page.locator('#email')).toHaveValue('new.member@example.com');

    await context.close();
  });

  test('pending approval login shows warning and stays on signin', async ({ browser }) => {
    const context = await browser.newContext();
    await installMockAuthServer(context, {
      onSignin: async () => ({
        status: 403,
        body: {
          code: 'ACCOUNT_PENDING_APPROVAL',
          error: 'Approval pending',
        },
      }),
    });
    const page = await context.newPage();

    await page.goto('/signin');
    await page.locator('#email').fill('pending.user@example.com');
    await page.locator('#password').fill('pending-pass');
    await page.getByRole('button', { name: '로그인', exact: true }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByText('관리자 승인 대기 중입니다. 승인 후 로그인해주세요.')).toBeVisible();

    await context.close();
  });

  test('signin page can resend verification email for verification-required account', async ({ browser }) => {
    const context = await browser.newContext();
    await installMockAuthServer(context, {
      onResendVerificationEmail: async () => ({
        status: 200,
        body: {
          message:
            '입력한 이메일이 가입 대기 중이면 인증 링크를 다시 전송했습니다. 이메일 인증과 관리자 승인 후 로그인하실 수 있습니다.',
        },
      }),
    });
    const page = await context.newPage();

    await page.goto('/signin?verificationEmail=pending.user%40example.com');
    await expect(page.getByText('이메일 인증 안내')).toBeVisible();
    await page.getByRole('button', { name: '인증 메일 다시 보내기' }).click();

    await expect(
      page.getByText(
        '입력한 이메일이 가입 대기 중이면 인증 링크를 다시 전송했습니다. 이메일 인증과 관리자 승인 후 로그인하실 수 있습니다.',
      ),
    ).toBeVisible();

    await context.close();
  });

  test('forgot password dialog requests a reset link', async ({ browser }) => {
    const context = await browser.newContext();
    await installMockAuthServer(context);
    const page = await context.newPage();

    await page.goto('/signin');
    await page.getByRole('button', { name: '비밀번호 재설정' }).click();
    await expect(page.getByRole('heading', { name: '비밀번호 재설정' })).toBeVisible();

    await page.locator('#resetEmail').fill(TEST_MEMBER.email);
    await page.locator('#resetPassword').fill('updated-password');
    await page.getByRole('button', { name: '비밀번호 재설정', exact: true }).click();

    await expect(page.getByText('비밀번호 재설정 링크를 이메일로 보냈습니다.')).toBeVisible();

    await context.close();
  });

  test('kakao callback error returns the user to signin', async ({ page }) => {
    await page.goto('/auth/kakao/callback?error=access_denied&error_description=Denied');

    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByText('카카오 로그인 실패: Denied')).toBeVisible();
  });
});
