import { memo } from 'react';
import { BiMoneyWithdraw } from 'react-icons/bi';
import { getDuesDisplayMeta } from '@/pages/member/lib/memberFormatters';

interface MemberDuesPanelProps {
  duesYears: number[];
  selectedUserDuesStatus: Record<number, boolean>;
}

function MemberDuesPanelComponent({ duesYears, selectedUserDuesStatus }: MemberDuesPanelProps) {
  return (
    <div className="border-t border-slate-100 bg-slate-50 px-6 py-6 md:px-8">
      <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
        <span aria-hidden="true" className="text-amber-500">
          <BiMoneyWithdraw />
        </span>
        회비 입금 여부
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {duesYears.length > 0 ? (
          duesYears.map((year) => {
            const isPaid = selectedUserDuesStatus[year] === true;
            const statusMeta = getDuesDisplayMeta(year, isPaid);

            return (
              <div
                key={`dues-${year}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <span className="font-bold text-slate-600">{year}년</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${statusMeta.className}`}
                >
                  <span aria-hidden="true">{statusMeta.icon}</span>
                  {statusMeta.label}
                </span>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
            회비 데이터 없음
          </div>
        )}
      </div>
    </div>
  );
}

const MemberDuesPanel = memo(MemberDuesPanelComponent);

export default MemberDuesPanel;
