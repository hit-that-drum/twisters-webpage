import { memo } from 'react';
import MemberAvatar from '@/pages/member/MemberAvatar';
import { renderDetailValue } from '@/pages/member/lib/memberFormatters';
import type { MemberUser } from '@/entities/user/types';

interface MemberSidebarProps {
  users: MemberUser[];
  selectedUserId: number | null;
  onSelectUser: (userId: number) => void;
}

function MemberSidebarComponent({ users, selectedUserId, onSelectUser }: MemberSidebarProps) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3 lg:sticky lg:top-6">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
        <h3
          id="member-directory-heading"
          className="text-sm font-bold uppercase tracking-wider text-slate-500"
        >
          Member Directory
        </h3>
      </div>

      <div className="flex flex-col" role="listbox" aria-labelledby="member-directory-heading">
        {users.length === 0 ? (
          <p className="px-4 py-5 text-sm font-medium text-slate-500">No members available.</p>
        ) : (
          users.map((user) => {
            const isActive = user.id === selectedUserId;

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelectUser(user.id)}
                role="option"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`flex w-full items-center gap-3 border-r-4 px-4 py-3 text-left transition-all ${
                  isActive
                    ? 'border-amber-300 bg-amber-50/60 text-slate-900'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset`}
              >
                <MemberAvatar
                  name={user.name}
                  profileImage={user.profileImage}
                  containerClassName={`inline-flex size-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${
                    isActive ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'
                  }`}
                  fallbackClassName="text-xs font-bold"
                />

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      isActive ? 'font-bold' : 'font-semibold'
                    }`}
                  >
                    {user.name}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {renderDetailValue(user.email)}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

const MemberSidebar = memo(MemberSidebarComponent);

export default MemberSidebar;
