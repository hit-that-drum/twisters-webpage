import { useCallback, useEffect, useMemo, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import { parseNoticeList } from '@/pages/notice/lib/noticeParsers';
import { DEFAULT_VISIBLE_NOTICES, type NoticeItem } from '@/pages/notice/lib/noticeTypes';

interface UseNoticeListResult {
  noticeList: NoticeItem[];
  displayedNotices: NoticeItem[];
  hasMoreNotices: boolean;
  isLoading: boolean;
  loadNotices: () => Promise<void>;
  handleLoadMoreNotices: () => void;
}

/**
 * Owns the notice list fetch and the "load more" visibility window.
 * Resets the visible count back to the default on every refetch so freshly
 * loaded notices do not inherit a previously expanded window.
 */
export default function useNoticeList(): UseNoticeListResult {
  const [noticeList, setNoticeList] = useState<NoticeItem[]>([]);
  const [visibleNoticeCount, setVisibleNoticeCount] = useState(DEFAULT_VISIBLE_NOTICES);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotices = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch('/notice');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        enqueueSnackbar(`공지사항 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      const normalizedList = parseNoticeList(payload);
      setNoticeList(normalizedList);
      setVisibleNoticeCount(DEFAULT_VISIBLE_NOTICES);
    } catch (error) {
      console.error('Notice list fetch error:', error);
      enqueueSnackbar('공지사항을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  const displayedNotices = useMemo(
    () => noticeList.slice(0, visibleNoticeCount),
    [noticeList, visibleNoticeCount],
  );
  const hasMoreNotices = noticeList.length > visibleNoticeCount;

  const handleLoadMoreNotices = useCallback(() => {
    setVisibleNoticeCount((previous) => previous + DEFAULT_VISIBLE_NOTICES);
  }, []);

  return {
    noticeList,
    displayedNotices,
    hasMoreNotices,
    isLoading,
    loadNotices,
    handleLoadMoreNotices,
  };
}
