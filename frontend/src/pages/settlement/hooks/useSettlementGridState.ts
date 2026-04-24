import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ROWS_PER_PAGE_OPTIONS,
  type SettlementRecord,
} from '@/pages/settlement/lib/settlementTypes';

interface UseSettlementGridStateOptions {
  settlementRows: SettlementRecord[];
}

interface UseSettlementGridStateResult {
  rowsPerPage: number;
  page: number;
  relationFilter: string;
  relationOptions: string[];
  pagedRows: SettlementRecord[];
  totalRows: number;
  pageStart: number;
  pageEnd: number;
  totalAmount: number;
  totalIncome: number;
  totalExpense: number;
  carryOverAmount: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  setRelationFilter: (relation: string) => void;
  setRowsPerPage: (next: number) => void;
  handlePreviousPage: () => void;
  handleNextPage: () => void;
}

/**
 * Derives sorted/filtered/paginated rows and aggregate totals from the raw
 * settlement list. Keeps page bounded to `maxPage` and resets it to 0 when
 * the relation filter or page size changes.
 */
export default function useSettlementGridState({
  settlementRows,
}: UseSettlementGridStateOptions): UseSettlementGridStateResult {
  const [rowsPerPage, setRowsPerPageState] = useState<number>(10);
  const [page, setPage] = useState(0);
  const [relationFilter, setRelationFilterState] = useState('');

  const sortedRows = useMemo(
    () => [...settlementRows].sort((left, right) => right.date.localeCompare(left.date)),
    [settlementRows],
  );

  const relationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sortedRows
            .map((row) => row.relation.trim())
            .filter((relation): relation is string => relation.length > 0),
        ),
      ),
    [sortedRows],
  );

  useEffect(() => {
    if (relationFilter && !relationOptions.includes(relationFilter)) {
      setRelationFilterState('');
      setPage(0);
    }
  }, [relationFilter, relationOptions]);

  const filteredRows = useMemo(() => {
    if (!relationFilter) {
      return sortedRows;
    }

    return sortedRows.filter((row) => row.relation.trim() === relationFilter);
  }, [relationFilter, sortedRows]);

  const totalRows = filteredRows.length;
  const maxPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);
  const currentPage = Math.min(page, maxPage);

  useEffect(() => {
    setPage((previous) => Math.min(previous, maxPage));
  }, [maxPage]);

  const pagedRows = useMemo(() => {
    const startIndex = currentPage * rowsPerPage;
    return filteredRows.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredRows, rowsPerPage]);

  const totalAmount = filteredRows.reduce((sum, row) => sum + row.amount, 0);
  const totalIncome = filteredRows.reduce(
    (sum, row) => (row.amount > 0 ? sum + row.amount : sum),
    0,
  );
  const totalExpense = filteredRows.reduce(
    (sum, row) => (row.amount < 0 ? sum + row.amount : sum),
    0,
  );
  const carryOverAmount = totalAmount;

  const pageStart = totalRows === 0 ? 0 : currentPage * rowsPerPage + 1;
  const pageEnd = totalRows === 0 ? 0 : Math.min((currentPage + 1) * rowsPerPage, totalRows);

  const setRelationFilter = useCallback((relation: string) => {
    setRelationFilterState(relation);
    setPage(0);
  }, []);

  const setRowsPerPage = useCallback((next: number) => {
    if (!ROWS_PER_PAGE_OPTIONS.includes(next as (typeof ROWS_PER_PAGE_OPTIONS)[number])) {
      return;
    }

    setRowsPerPageState(next);
    setPage(0);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setPage((previous) => Math.max(0, previous - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((previous) => Math.min(maxPage, previous + 1));
  }, [maxPage]);

  return {
    rowsPerPage,
    page: currentPage,
    relationFilter,
    relationOptions,
    pagedRows,
    totalRows,
    pageStart,
    pageEnd,
    totalAmount,
    totalIncome,
    totalExpense,
    carryOverAmount,
    canGoPrevious: currentPage > 0,
    canGoNext: currentPage < maxPage,
    setRelationFilter,
    setRowsPerPage,
    handlePreviousPage,
    handleNextPage,
  };
}
