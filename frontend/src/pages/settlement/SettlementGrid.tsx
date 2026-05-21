import { memo } from 'react';
import { EditDeleteButton, GlobalButton } from '@/common/components';
import {
  ROWS_PER_PAGE_OPTIONS,
  type SettlementRecord,
} from '@/pages/settlement/lib/settlementTypes';
import { formatAmount } from '@/pages/settlement/lib/settlementHelpers';

interface SettlementGridProps {
  rows: SettlementRecord[];
  canManageSettlements: boolean;
  deletingSettlementId: number | null;
  onOpenAddDialog: () => void;
  relationFilter: string;
  relationOptions: string[];
  onRelationFilterChange: (relation: string) => void;
  emptyStateMessage: string;
  onEdit: (record: SettlementRecord) => void;
  onDelete: (settlementId: number) => Promise<void>;
  totalAmount: number;
  totalIncome: number;
  totalExpense: number;
  carryOverAmount: number;
  rowsPerPage: number;
  pageStart: number;
  pageEnd: number;
  totalRows: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

const SettlementGrid = memo(function SettlementGrid({
  rows,
  canManageSettlements,
  deletingSettlementId,
  onOpenAddDialog,
  relationFilter,
  relationOptions,
  onRelationFilterChange,
  emptyStateMessage,
  onEdit,
  onDelete,
  totalAmount,
  totalIncome,
  totalExpense,
  carryOverAmount,
  rowsPerPage,
  pageStart,
  pageEnd,
  totalRows,
  canGoPrevious,
  canGoNext,
  onRowsPerPageChange,
  onPreviousPage,
  onNextPage,
}: SettlementGridProps) {
  return (
    <>
      <main className="mx-auto w-full flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-10 md:py-8">
        <div className="mb-4 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
            SETTLEMENT
          </h1>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <label className="flex w-full items-center gap-2 text-xs font-medium text-slate-600 sm:w-auto sm:text-sm">
              <span className="shrink-0">Relation filter</span>
              <div className="relative w-full sm:w-auto">
                <select
                  value={relationFilter}
                  onChange={(event) => onRelationFilterChange(event.target.value)}
                  className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white py-1 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-amber-400 sm:h-10"
                  aria-label="Filter settlements by relation"
                >
                  <option value="">All Relations</option>
                  {relationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
                >
                  ▾
                </span>
              </div>
            </label>

            {canManageSettlements && (
              <GlobalButton
                onClick={onOpenAddDialog}
                label="ADD SETTLEMENT"
                iconBasicMappingType="ADD"
                className="h-10 w-full min-w-0 px-3 text-xs sm:h-12 sm:w-auto sm:min-w-[140px] sm:px-4 sm:text-sm"
              />
            )}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 md:mb-6 md:grid-cols-4 md:gap-4">
          <div
            className="rounded-xl border px-3 py-3 sm:px-4 sm:py-4"
            style={{
              backgroundColor: 'rgba(255, 215, 0, 0.08)',
              borderColor: 'rgba(255, 215, 0, 0.3)',
            }}
          >
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
              합계
            </p>
            <p
              className="break-all text-base font-black leading-tight sm:text-lg md:text-2xl"
              style={{ color: '#FFB800' }}
            >
              {formatAmount(totalAmount)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4">
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
              총 수입
            </p>
            <p className="break-all text-base font-black leading-tight text-emerald-500 sm:text-lg md:text-2xl">
              {formatAmount(totalIncome)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4">
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
              총 지출
            </p>
            <p className="break-all text-base font-black leading-tight text-red-500 sm:text-lg md:text-2xl">
              {formatAmount(totalExpense)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4">
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
              이월 잔액
            </p>
            <p
              className="break-all text-base font-black leading-tight sm:text-lg md:text-2xl"
              style={{ color: '#FFB800' }}
            >
              {formatAmount(carryOverAmount)}
            </p>
          </div>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm font-medium text-slate-500">
              {emptyStateMessage}
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => {
                const isExpense = row.amount < 0;
                const relationLabel = row.relation.trim() || (isExpense ? 'Expense' : 'Income');
                const relationClassName = isExpense
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-emerald-700';

                return (
                  <li
                    key={row.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs text-slate-500">{row.date}</span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${relationClassName}`}
                          >
                            {relationLabel}
                          </span>
                        </div>
                        <p className="truncate text-sm font-medium text-slate-900">{row.item}</p>
                        <p
                          className={`mt-1 text-base font-black ${
                            isExpense ? 'text-red-500' : 'text-slate-900'
                          }`}
                        >
                          {formatAmount(row.amount)}
                        </p>
                      </div>

                      {canManageSettlements && (
                        <div className="shrink-0">
                          <EditDeleteButton
                            onEditClick={() => onEdit(row)}
                            onDeleteClick={() => {
                              void onDelete(row.id);
                            }}
                            isDeleting={deletingSettlementId === row.id}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th
                    scope="col"
                    className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500"
                  >
                    날짜
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500"
                  >
                    항목
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500"
                  >
                    금액
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500"
                  >
                    Relation
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-sm font-bold uppercase tracking-wider text-slate-500"
                  >
                    관리
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm font-medium text-slate-500"
                    >
                      {emptyStateMessage}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const relationLabel =
                      row.relation.trim() || (row.amount < 0 ? 'Expense' : 'Income');
                    const relationClassName =
                      row.amount < 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700';

                    return (
                      <tr key={row.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-5 text-sm text-slate-600">{row.date}</td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-900">{row.item}</td>
                        <td
                          className={`px-6 py-5 text-sm font-bold ${
                            row.amount < 0 ? 'text-red-500' : 'text-slate-900'
                          }`}
                        >
                          {formatAmount(row.amount)}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${relationClassName}`}
                          >
                            {relationLabel}
                          </span>
                        </td>
                        <td className="space-x-2 px-6 py-5 text-right">
                          {canManageSettlements ? (
                            <EditDeleteButton
                              onEditClick={() => onEdit(row)}
                              onDeleteClick={() => {
                                void onDelete(row.id);
                              }}
                              isDeleting={deletingSettlementId === row.id}
                            />
                          ) : (
                            <span className="text-sm text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <nav
          aria-label="Settlement pagination"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 sm:mt-6 sm:gap-6 sm:text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page:</span>
            <span className="sm:hidden">Rows:</span>
            <div className="relative">
              <select
                value={rowsPerPage}
                onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
                className="cursor-pointer appearance-none rounded-lg border border-slate-300 bg-transparent py-1 pl-2 pr-7 focus:outline-none focus:ring-1 focus:ring-amber-300"
              >
                {ROWS_PER_PAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400"
              >
                ▾
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <span>{`${pageStart}-${pageEnd} of ${totalRows}`}</span>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={onPreviousPage}
                disabled={!canGoPrevious}
                className="rounded p-1 transition-colors hover:bg-slate-200 disabled:opacity-30"
                aria-label="Previous page"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={onNextPage}
                disabled={!canGoNext}
                className="rounded p-1 transition-colors hover:bg-slate-200 disabled:opacity-30"
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        </nav>
      </main>
    </>
  );
});

export default SettlementGrid;
