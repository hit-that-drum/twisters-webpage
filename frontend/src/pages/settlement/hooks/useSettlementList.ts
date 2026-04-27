import { useCallback, useEffect, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, isEmptyListResponse, parseApiResponse } from '@/common/lib/api/apiHelpers';
import { parseSettlementRows } from '@/pages/settlement/lib/settlementParsers';
import type { SettlementRecord } from '@/pages/settlement/lib/settlementTypes';

interface UseSettlementListOptions {
  onExpiredSession: () => void;
}

interface UseSettlementListResult {
  settlementRows: SettlementRecord[];
  isLoading: boolean;
  loadSettlements: () => Promise<void>;
}

/**
 * Owns the `/settlement` fetch and exposes the raw row list. Downstream
 * hooks handle sorting, filtering, and pagination.
 */
export default function useSettlementList({
  onExpiredSession,
}: UseSettlementListOptions): UseSettlementListResult {
  const [settlementRows, setSettlementRows] = useState<SettlementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSettlements = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch('/settlement');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        if (isEmptyListResponse(response, payload, ['정산', 'settlement', 'settlements', 'data'])) {
          setSettlementRows([]);
          return;
        }

        enqueueSnackbar(`정산 내역 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      setSettlementRows(parseSettlementRows(payload));
    } catch (error) {
      console.error('Settlement list fetch error:', error);
      enqueueSnackbar('정산 내역을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [onExpiredSession]);

  useEffect(() => {
    void loadSettlements();
  }, [loadSettlements]);

  return {
    settlementRows,
    isLoading,
    loadSettlements,
  };
}
