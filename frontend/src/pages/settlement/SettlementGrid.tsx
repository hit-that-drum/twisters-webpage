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
      <main className="mx-auto w-full flex-1 px-4 py-8 md:px-10">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900">
            SETTLEMENT
          </h1>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <label className="flex w-full min-w-[220px] items-center gap-2 text-sm font-medium text-slate-600 sm:w-auto">
              <span className="shrink-0">Relation filter</span>
              <div className="relative w-full sm:w-auto">
                <select
                  value={relationFilter}
                  onChange={(event) => onRelationFilterChange(event.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white py-1 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-amber-400"
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
              />
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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

        <div className="mt-6 flex flex-col items-center justify-between gap-6 lg:flex-row">
          <div
            className="w-full rounded-xl border px-6 py-4 lg:w-auto"
            style={{
              backgroundColor: 'rgba(255, 215, 0, 0.05)',
              borderColor: 'rgba(255, 215, 0, 0.2)',
            }}
          >
            <h3 className="text-lg font-medium text-slate-700">
              합계
              <span className="ml-2 text-2xl font-black" style={{ color: '#FFD700' }}>
                {formatAmount(totalAmount)}
              </span>
            </h3>
          </div>

          <nav
            aria-label="Settlement pagination"
            className="flex flex-col items-center gap-4 text-sm text-slate-500 sm:flex-row sm:gap-6"
          >
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <div className="relative">
                <select
                  value={rowsPerPage}
                  onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
                  className="cursor-pointer appearance-none rounded-lg border border-slate-300 bg-transparent py-1 pl-2 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-300"
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

            <span>{`${pageStart}-${pageEnd} of ${totalRows}`}</span>

            <div className="flex gap-2">
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
          </nav>
        </div>
      </main>

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-12 md:px-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="mb-1 text-sm font-medium uppercase tracking-wider text-slate-500">
              총 수입
            </p>
            <p className="text-2xl font-black text-emerald-500">{formatAmount(totalIncome)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="mb-1 text-sm font-medium uppercase tracking-wider text-slate-500">
              총 지출
            </p>
            <p className="text-2xl font-black text-red-500">{formatAmount(totalExpense)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="mb-1 text-sm font-medium uppercase tracking-wider text-slate-500">
              이월 잔액
            </p>
            <p className="text-2xl font-black" style={{ color: '#FFD700' }}>
              {formatAmount(carryOverAmount)}
            </p>
          </div>
        </div>
      </section>
    </>
  );
});

export default SettlementGrid;
