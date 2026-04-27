import { memo } from 'react';
import { formatCount } from '@/pages/adminpage/lib/adminFormatters';

interface AdminStatsCardsProps {
  totalMembersCount: number;
  pendingApprovalsCount: number;
  activeUsersCount: number;
}

function AdminStatsCards({
  totalMembersCount,
  pendingApprovalsCount,
  activeUsersCount,
}: AdminStatsCardsProps) {
  return (
    <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="rounded-lg p-3 text-amber-400"
            style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)' }}
          >
            👥
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Members</p>
            <p className="text-2xl font-bold text-slate-900">{formatCount(totalMembersCount)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-amber-100 p-3 text-amber-600">⏳</div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCount(pendingApprovalsCount)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600">✓</div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Today</p>
            <p className="text-2xl font-bold text-slate-900">{formatCount(activeUsersCount)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(AdminStatsCards);
