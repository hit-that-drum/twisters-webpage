import type { NoticeItem } from './noticeTypes';

export const parseNoticeList = (payload: unknown): NoticeItem[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as {
        id?: unknown;
        title?: unknown;
        createUser?: unknown;
        createDate?: unknown;
        updateUser?: unknown;
        updateDate?: unknown;
        imageUrl?: unknown;
        content?: unknown;
        pinned?: unknown;
      };

      if (
        typeof row.id !== 'number' ||
        typeof row.title !== 'string' ||
        typeof row.createUser !== 'string' ||
        typeof row.createDate !== 'string' ||
        typeof row.content !== 'string'
      ) {
        return null;
      }

      const normalizedPinned =
        row.pinned === true || row.pinned === 1 || row.pinned === '1' || row.pinned === 'true';

      const normalizedUpdateUser =
        typeof row.updateUser === 'string' && row.updateUser.trim().length > 0
          ? row.updateUser
          : row.createUser;

      const normalizedUpdateDate =
        typeof row.updateDate === 'string' && row.updateDate.trim().length > 0
          ? row.updateDate
          : row.createDate;

      const normalizedImageUrl =
        typeof row.imageUrl === 'string' && row.imageUrl.trim().length > 0
          ? row.imageUrl.trim()
          : null;

      return {
        id: row.id,
        title: row.title,
        createUser: row.createUser,
        createDate: row.createDate,
        updateUser: normalizedUpdateUser,
        updateDate: normalizedUpdateDate,
        imageUrl: normalizedImageUrl,
        content: row.content,
        pinned: normalizedPinned,
      } satisfies NoticeItem;
    })
    .filter((item): item is NoticeItem => item !== null);
};
