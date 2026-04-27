import { memo } from 'react';
import type { PendingUserRecord } from '@/entities/user/types';
import {
  formatKoreanDateTime,
  getEmailVerificationMeta,
} from '@/pages/adminpage/lib/adminFormatters';

interface AdminPendingUsersPanelProps {
  pendingUsers: PendingUserRecord[];
  approvingUserId: number | null;
  decliningUserId: number | null;
  isRefreshing: boolean;
  onApprove: (userId: number) => void;
  onDecline: (userId: number) => void;
  onRefresh: () => void;
}

function AdminPendingUsersPanel({
  pendingUsers,
  approvingUserId,
  decliningUserId,
  isRefreshing,
  onApprove,
  onDecline,
  onRefresh,
}: AdminPendingUsersPanelProps) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <span aria-hidden="true" className="text-amber-400">
            ⌛
          </span>
          Pending Approvals
        </h2>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-slate-50 text-5xl text-slate-300">
            ☑
          </div>
          <h3 className="mb-1 text-lg font-bold text-slate-900">No pending approvals</h3>
          <p className="mb-6 max-w-sm text-slate-500">
            All community requests and content approvals have been processed. Good job!
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            <span aria-hidden="true">↻</span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh List'}</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {pendingUsers.map((user) => {
              const verificationMeta = getEmailVerificationMeta(user.emailVerifiedAt);
              const isBusy = approvingUserId === user.id || decliningUserId === user.id;

              return (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base font-bold text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-xs text-slate-400">
                      Requested at {formatKoreanDateTime(user.createdAt)}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${verificationMeta.className}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`size-2 rounded-full ${verificationMeta.dotClassName}`}
                        />
                        {verificationMeta.label}
                      </span>
                      <span className="text-slate-500">{verificationMeta.detail}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onDecline(user.id)}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {decliningUserId === user.id ? 'Declining...' : 'Decline'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onApprove(user.id)}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {approvingUserId === user.id ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(AdminPendingUsersPanel);
