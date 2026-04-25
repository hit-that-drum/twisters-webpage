import { expect, test, type BrowserContext, type Route } from '@playwright/test';
import { MEMBER_NORMAL, TEST_ADMIN, TEST_MEMBER, type MockAccount } from './helpers/accounts';
import { installMockAuthServer, seedRememberedAuthSession } from './helpers/auth';

interface BoardPostItem {
  id: number;
  authorId: number | null;
  title: string;
  createUser: string;
  createDate: string;
  updateUser: string;
  updateDate: string;
  imageUrl: string[];
  content: string;
  pinned: boolean;
  reactions: {
    thumbsUpCount: number;
    thumbsDownCount: number;
    favoriteCount: number;
    heartCount: number;
    userReactions: Array<'thumbsUp' | 'thumbsDown' | 'favorite' | 'heart'>;
  };
}

interface BoardCommentItem {
  id: number;
  boardId: number;
  authorId: number | null;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const createPosts = (): BoardPostItem[] => [
  {
    id: 101,
    authorId: TEST_MEMBER.id,
    title: 'Pinned Update',
    createUser: TEST_MEMBER.name,
    createDate: '2026-03-20T10:00:00.000Z',
    updateUser: TEST_MEMBER.name,
    updateDate: '2026-03-20T10:00:00.000Z',
    imageUrl: ['https://example.com/pinned-1.jpg', 'https://example.com/pinned-2.jpg'],
    content: 'Pinned content for the board page.',
    pinned: true,
    reactions: {
      thumbsUpCount: 6,
      thumbsDownCount: 0,
      favoriteCount: 2,
      heartCount: 4,
      userReactions: [],
    },
  },
  {
    id: 102,
    authorId: TEST_MEMBER.id,
    title: 'Alpha Search Match',
    createUser: TEST_MEMBER.name,
    createDate: '2026-03-19T10:00:00.000Z',
    updateUser: TEST_MEMBER.name,
    updateDate: '2026-03-19T10:00:00.000Z',
    imageUrl: [],
    content: 'Alpha body for search filtering.',
    pinned: false,
    reactions: {
      thumbsUpCount: 1,
      thumbsDownCount: 0,
      favoriteCount: 0,
      heartCount: 1,
      userReactions: [],
    },
  },
  {
    id: 103,
    authorId: MEMBER_NORMAL.id,
    title: 'Board Beta',
    createUser: MEMBER_NORMAL.name,
    createDate: '2026-03-18T10:00:00.000Z',
    updateUser: MEMBER_NORMAL.name,
    updateDate: '2026-03-18T10:00:00.000Z',
    imageUrl: [],
    content: 'Beta content.',
    pinned: false,
    reactions: {
      thumbsUpCount: 0,
      thumbsDownCount: 0,
      favoriteCount: 1,
      heartCount: 0,
      userReactions: [],
    },
  },
  {
    id: 104,
    authorId: MEMBER_NORMAL.id,
    title: 'Board Gamma',
    createUser: MEMBER_NORMAL.name,
    createDate: '2026-03-17T10:00:00.000Z',
    updateUser: MEMBER_NORMAL.name,
    updateDate: '2026-03-17T10:00:00.000Z',
    imageUrl: [],
    content: 'Gamma content.',
    pinned: false,
    reactions: {
      thumbsUpCount: 0,
      thumbsDownCount: 2,
      favoriteCount: 0,
      heartCount: 0,
      userReactions: [],
    },
  },
  {
    id: 105,
    authorId: MEMBER_NORMAL.id,
    title: 'Board Delta',
    createUser: MEMBER_NORMAL.name,
    createDate: '2026-03-16T10:00:00.000Z',
    updateUser: MEMBER_NORMAL.name,
    updateDate: '2026-03-16T10:00:00.000Z',
    imageUrl: [],
    content: 'Delta content.',
    pinned: false,
    reactions: {
      thumbsUpCount: 3,
      thumbsDownCount: 1,
      favoriteCount: 0,
      heartCount: 2,
      userReactions: [],
    },
  },
  {
    id: 106,
    authorId: MEMBER_NORMAL.id,
    title: 'Board Epsilon',
    createUser: MEMBER_NORMAL.name,
    createDate: '2026-03-15T10:00:00.000Z',
    updateUser: MEMBER_NORMAL.name,
    updateDate: '2026-03-15T10:00:00.000Z',
    imageUrl: [],
    content: 'Epsilon content.',
    pinned: false,
    reactions: {
      thumbsUpCount: 0,
      thumbsDownCount: 0,
      favoriteCount: 0,
      heartCount: 0,
      userReactions: [],
    },
  },
];

const createComments = (): Record<number, BoardCommentItem[]> => ({
  101: [
    {
      id: 9001,
      boardId: 101,
      authorId: TEST_MEMBER.id,
      authorName: TEST_MEMBER.name,
      content: 'Existing comment',
      createdAt: '2026-03-20T12:00:00.000Z',
      updatedAt: '2026-03-20T12:00:00.000Z',
    },
  ],
});

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

const resolvePostIdFromUrl = (route: Route) => {
  const matches = route.request().url().match(
    /\/board\/(\d+)(?:\/comments(?:\/\d+)?|\/reactions)?(?:\?.*)?$/,
  );
  return matches ? Number(matches[1]) : null;
};

const resolveCommentIdFromUrl = (route: Route) => {
  const matches = route.request().url().match(/\/board\/\d+\/comments\/(\d+)(?:\?.*)?$/);
  return matches ? Number(matches[1]) : null;
};

const shouldBypassForDocumentNavigation = (route: Route) => route.request().isNavigationRequest();

const installBoardMockServer = async (context: BrowserContext) => {
  const accounts = [TEST_ADMIN, TEST_MEMBER, MEMBER_NORMAL];
  let posts = createPosts();
  let commentsByPost = createComments();
  let nextPostId = 1000;
  let nextCommentId = 10000;

  await installMockAuthServer(context, { accounts });

  await context.route('**/board*', async (route) => {
    if (shouldBypassForDocumentNavigation(route)) {
      await route.fallback();
      return;
    }

    const url = new URL(route.request().url());
    if (url.pathname !== '/board') {
      await route.fallback();
      return;
    }

    if (route.request().method() === 'GET') {
      const search = url.searchParams.get('search')?.trim().toLowerCase() ?? '';
      const sort = url.searchParams.get('sort') ?? 'latest';

      let filteredPosts = posts.filter((post) => {
        if (!search) {
          return true;
        }

        return [post.title, post.content, post.createUser].some((value) =>
          value.toLowerCase().includes(search),
        );
      });

      if (sort === 'oldest') {
        filteredPosts = [...filteredPosts].sort((left, right) => left.id - right.id);
      } else if (sort === 'updated') {
        filteredPosts = [...filteredPosts].sort((left, right) =>
          right.updateDate.localeCompare(left.updateDate),
        );
      } else if (sort === 'pinned') {
        filteredPosts = [...filteredPosts].sort(
          (left, right) => Number(right.pinned) - Number(left.pinned),
        );
      } else {
        filteredPosts = [...filteredPosts].sort((left, right) => right.id - left.id);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(filteredPosts),
      });
      return;
    }

    const account = findAccountByAuthorizationHeader(accounts, route.request().headers().authorization);
    if (!account) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
      return;
    }

    const payload = route.request().postDataJSON() as {
      title?: string;
      content?: string;
      imageUrl?: string[];
      pinned?: boolean;
    } | null;

    const createdPost: BoardPostItem = {
      id: nextPostId++,
      authorId: account.id,
      title: payload?.title ?? '',
      createUser: account.name,
      createDate: '2026-03-25T10:00:00.000Z',
      updateUser: account.name,
      updateDate: '2026-03-25T10:00:00.000Z',
      imageUrl: Array.isArray(payload?.imageUrl) ? payload.imageUrl : [],
      content: payload?.content ?? '',
      pinned: account.isAdmin ? payload?.pinned === true : false,
      reactions: {
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        favoriteCount: 0,
        heartCount: 0,
        userReactions: [],
      },
    };

    posts = [createdPost, ...posts];
    commentsByPost = {
      ...commentsByPost,
      [createdPost.id]: [],
    };

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ message: '게시글이 등록되었습니다.' }),
    });
  });

  await context.route('**/board/*/comments/*', async (route) => {
    if (shouldBypassForDocumentNavigation(route)) {
      await route.fallback();
      return;
    }

    const account = findAccountByAuthorizationHeader(accounts, route.request().headers().authorization);
    if (!account) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
      return;
    }

    const postId = resolvePostIdFromUrl(route);
    const commentId = resolveCommentIdFromUrl(route);
    if (postId === null || commentId === null) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Comment not found' }),
      });
      return;
    }

    const comments = commentsByPost[postId] ?? [];
    const targetComment = comments.find((comment) => comment.id === commentId) ?? null;

    if (!targetComment || (!account.isAdmin && targetComment.authorId !== account.id)) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      });
      return;
    }

    commentsByPost = {
      ...commentsByPost,
      [postId]: comments.filter((comment) => comment.id !== commentId),
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: '댓글이 삭제되었습니다.' }),
    });
  });

  await context.route('**/board/*/comments', async (route) => {
    if (shouldBypassForDocumentNavigation(route)) {
      await route.fallback();
      return;
    }

    const postId = resolvePostIdFromUrl(route);
    if (postId === null) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Post not found' }),
      });
      return;
    }

    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(commentsByPost[postId] ?? []),
      });
      return;
    }

    const account = findAccountByAuthorizationHeader(accounts, route.request().headers().authorization);
    if (!account) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
      return;
    }

    const payload = route.request().postDataJSON() as { content?: string } | null;
    const createdComment: BoardCommentItem = {
      id: nextCommentId++,
      boardId: postId,
      authorId: account.id,
      authorName: account.name,
      content: payload?.content ?? '',
      createdAt: '2026-03-25T10:10:00.000Z',
      updatedAt: '2026-03-25T10:10:00.000Z',
    };

    commentsByPost = {
      ...commentsByPost,
      [postId]: [...(commentsByPost[postId] ?? []), createdComment],
    };

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ message: '댓글이 등록되었습니다.' }),
    });
  });

  await context.route('**/board/*', async (route) => {
    if (shouldBypassForDocumentNavigation(route)) {
      await route.fallback();
      return;
    }

    const postId = resolvePostIdFromUrl(route);
    if (postId === null) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Post not found' }),
      });
      return;
    }

    const account = findAccountByAuthorizationHeader(accounts, route.request().headers().authorization);
    if (!account) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
      return;
    }

    const existingPost = posts.find((post) => post.id === postId) ?? null;
    if (!existingPost || (!account.isAdmin && existingPost.authorId !== account.id)) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      });
      return;
    }

    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON() as {
        title?: string;
        content?: string;
        imageUrl?: string[];
        pinned?: boolean;
      } | null;

      posts = posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              title: payload?.title ?? post.title,
              content: payload?.content ?? post.content,
              imageUrl: Array.isArray(payload?.imageUrl) ? payload.imageUrl : post.imageUrl,
              pinned: account.isAdmin ? payload?.pinned === true : post.pinned,
              updateUser: account.name,
              updateDate: '2026-03-25T11:00:00.000Z',
            }
          : post,
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: '게시글이 수정되었습니다.' }),
      });
      return;
    }

    posts = posts.filter((post) => post.id !== postId);
    delete commentsByPost[postId];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: '게시글이 삭제되었습니다.' }),
    });
  });
};

test.describe('board page', () => {
  test('search and load more posts work for an authenticated member', async ({ browser }) => {
    const context = await browser.newContext();
    await installBoardMockServer(context);
    const page = await context.newPage();
    await seedRememberedAuthSession(page, TEST_MEMBER);

    await page.goto('/board');
    await expect(page.getByRole('heading', { name: 'BOARD' })).toBeVisible();
    await expect(page.getByText('Pinned Update')).not.toBeVisible();

    await page.getByPlaceholder('Search title/content/author').fill('Alpha');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('Alpha Search Match')).toBeVisible();
    await expect(page.getByText('Board Beta')).not.toBeVisible();

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByText('Board Epsilon')).toBeVisible();
    await page.getByRole('button', { name: 'Load More Posts' }).click();
    await expect(page.getByText('Pinned Update')).toBeVisible();

    await context.close();
  });

  test('member can create a post and manage their own comments', async ({ browser }) => {
    const context = await browser.newContext();
    await installBoardMockServer(context);
    const page = await context.newPage();
    await seedRememberedAuthSession(page, TEST_MEMBER);

    await page.goto('/board');
    await page.getByRole('button', { name: 'Add Post' }).click();
    const addDialog = page.getByRole('dialog', { name: '게시물 등록' });
    await expect(addDialog).toBeVisible();

    await addDialog.getByRole('textbox', { name: 'TITLE' }).fill('Playwright Created Post');
    await addDialog.getByRole('textbox', { name: 'CONTENT' }).fill('Created from an E2E test.');
    await addDialog.getByRole('button', { name: '저장', exact: true }).click();

    await expect(page.getByText('Playwright Created Post')).toBeVisible();

    const createdArticle = page.locator('article').filter({ hasText: 'Playwright Created Post' });
    await createdArticle.getByRole('button', { name: 'Expand post content' }).click();
    await expect(createdArticle.getByText('Comments')).toBeVisible();
    await createdArticle.getByPlaceholder('댓글을 입력하세요').fill('Fresh comment from test');
    await createdArticle.getByRole('button', { name: 'Add Comment' }).click();

    await expect(createdArticle.getByText('Fresh comment from test')).toBeVisible();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    const ownComment = createdArticle.locator('li').filter({ hasText: 'Fresh comment from test' });
    await ownComment.locator('button').click();

    await expect(ownComment).toHaveCount(0);

    await context.close();
  });

  test('admin can open the board image modal and navigate images', async ({ browser }) => {
    const context = await browser.newContext();
    await installBoardMockServer(context);
    const page = await context.newPage();
    await seedRememberedAuthSession(page, TEST_ADMIN);

    await page.goto('/board');
    await page.getByRole('button', { name: 'Load More Posts' }).click();
    const pinnedArticle = page.locator('article').filter({ hasText: 'Pinned Update' });
    await pinnedArticle.locator('[aria-haspopup="dialog"]').click();

    await expect(page.getByRole('heading', { name: 'Pinned Update (1/2)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next image' })).toBeVisible();
    await page.getByRole('button', { name: 'Next image' }).click();
    await expect(page.getByRole('heading', { name: 'Pinned Update (2/2)' })).toBeVisible();
    await page.getByRole('button', { name: 'Show image 1 for Pinned Update' }).click();
    await expect(page.getByRole('heading', { name: 'Pinned Update (1/2)' })).toBeVisible();
    await page.getByRole('button', { name: '닫기', exact: true }).click();

    await expect(page.getByRole('dialog', { name: /Pinned Update/ })).toHaveCount(0);

    await context.close();
  });
});
