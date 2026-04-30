import { memo } from 'react';
import { getAttendanceStatusKey } from '@/pages/member/lib/memberParsers';
import {
  getMeetingAttendanceDisplayMeta,
  getMeetingPeriodLabel,
} from '@/pages/member/lib/memberFormatters';

interface MemberAttendancePanelProps {
  attendancePeriods: Array<{ year: number; period: number }>;
  selectedUserAttendanceStatus: Record<string, boolean>;
  updatingAttendanceKey: string | null;
  canManageMembers: boolean;
  onSetAttendance: (year: number, period: number, attended: boolean) => void;
  onResetAttendance: (year: number, period: number) => void;
}

function MemberAttendancePanelComponent({
  attendancePeriods,
  selectedUserAttendanceStatus,
  updatingAttendanceKey,
  canManageMembers,
  onSetAttendance,
  onResetAttendance,
}: MemberAttendancePanelProps) {
  return (
    <div className="border-t border-slate-100 bg-white px-6 py-6 md:px-8">
      <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
        <span aria-hidden="true" className="text-sky-500">
          📅
        </span>
        연도/차수별 모임 참석 여부
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {attendancePeriods.length > 0 ? (
          attendancePeriods.map(({ year, period }) => {
            const attendanceKey = getAttendanceStatusKey(year, period);
            const isAttended = selectedUserAttendanceStatus[attendanceKey] === true;
            const statusMeta = getMeetingAttendanceDisplayMeta(year, period, isAttended);
            const isUpdatingYear = updatingAttendanceKey === attendanceKey;

            return (
              <div
                key={`attendance-${attendanceKey}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-600">{year}년</span>
                  <span className="text-xs font-semibold text-slate-400">
                    {getMeetingPeriodLabel(period)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${statusMeta.className}`}
                  >
                    <span aria-hidden="true">{statusMeta.icon}</span>
                    {statusMeta.label}
                  </span>

                  {canManageMembers && (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onSetAttendance(year, period, true)}
                        disabled={isUpdatingYear}
                        className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdatingYear ? '저장 중...' : '참석'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetAttendance(year, period, false)}
                        disabled={isUpdatingYear}
                        className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        미참석
                      </button>
                      <button
                        type="button"
                        onClick={() => onResetAttendance(year, period)}
                        disabled={isUpdatingYear}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        자동
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
            모임 참석 데이터 없음
          </div>
        )}
      </div>
    </div>
  );
}

const MemberAttendancePanel = memo(MemberAttendancePanelComponent);

export default MemberAttendancePanel;
