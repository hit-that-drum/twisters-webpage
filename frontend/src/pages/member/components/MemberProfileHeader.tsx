import { memo } from 'react';
import { EditDeleteButton } from '@/common/components';
import MemberAvatar from '@/pages/member/MemberAvatar';
import { renderDetailValue } from '@/pages/member/lib/memberFormatters';
import type { DetailInfoItem } from '@/pages/member/lib/memberTypes';
import type { MemberUser } from '@/entities/user/types';

interface MemberProfileHeaderProps {
  selectedUser: MemberUser;
  detailInfo: DetailInfoItem[];
  canManageMembers: boolean;
  onEditClick: () => void;
}

function MemberProfileHeaderComponent({
  selectedUser,
  detailInfo,
  canManageMembers,
  onEditClick,
}: MemberProfileHeaderProps) {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-5 md:mb-8 md:gap-5 md:pb-8">
        <MemberAvatar
          key={`${selectedUser.id}:${selectedUser.profileImage ?? ''}`}
          name={selectedUser.name}
          profileImage={selectedUser.profileImage}
          containerClassName="inline-flex size-16 md:size-24 items-center justify-center overflow-hidden rounded-full border-2 md:border-4 border-amber-300 bg-slate-100 text-2xl md:text-4xl font-black text-slate-500 shadow-inner shrink-0"
          fallbackClassName="text-2xl md:text-4xl font-black text-slate-500"
        />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl md:text-3xl font-black tracking-tight text-slate-900">
            {selectedUser.name}
          </h2>
          <div className="mt-1.5 md:mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-bold text-blue-700">
              {selectedUser.isAdmin ? 'Administrator' : 'Member'}
            </span>
          </div>
        </div>

        {canManageMembers && (
          <div className="shrink-0">
            <EditDeleteButton onEditClick={onEditClick} isExisteDeleteButton={false} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-12 gap-y-3 md:gap-y-4 md:grid-cols-2 xl:grid-cols-2">
        {detailInfo.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3">
            <p className="shrink-0 text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">
              {item.label}
            </p>
            <p className="truncate text-sm md:text-lg font-semibold text-slate-800 text-right">
              {renderDetailValue(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const MemberProfileHeader = memo(MemberProfileHeaderComponent);

export default MemberProfileHeader;
