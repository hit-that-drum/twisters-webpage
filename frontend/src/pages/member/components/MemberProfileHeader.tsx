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
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-5 border-b border-slate-100 pb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <MemberAvatar
            key={`${selectedUser.id}:${selectedUser.profileImage ?? ''}`}
            name={selectedUser.name}
            profileImage={selectedUser.profileImage}
            containerClassName="inline-flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-amber-300 bg-slate-100 text-4xl font-black text-slate-500 shadow-inner"
            fallbackClassName="text-4xl font-black text-slate-500"
          />

          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">
              {selectedUser.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                {selectedUser.isAdmin ? 'Administrator' : 'Member'}
              </span>
            </div>
          </div>
        </div>

        {canManageMembers && (
          <EditDeleteButton onEditClick={onEditClick} isExisteDeleteButton={false} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-12 gap-y-7 md:grid-cols-2 xl:grid-cols-2">
        {detailInfo.map((item) => (
          <div key={item.key} className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {item.label}
            </p>
            <p className="text-lg font-semibold text-slate-800">{renderDetailValue(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const MemberProfileHeader = memo(MemberProfileHeaderComponent);

export default MemberProfileHeader;
