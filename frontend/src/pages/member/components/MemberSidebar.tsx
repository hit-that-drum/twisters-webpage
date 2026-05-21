import { memo, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import MemberAvatar from '@/pages/member/MemberAvatar';
import { renderDetailValue } from '@/pages/member/lib/memberFormatters';
import type { MemberUser } from '@/entities/user/types';

interface MemberSidebarProps {
  users: MemberUser[];
  selectedUserId: number | null;
  onSelectUser: (userId: number) => void;
}

function MemberSidebarComponent({ users, selectedUserId, onSelectUser }: MemberSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const listId = 'member-directory-list';

  const handleSelectUser = (userId: number) => {
    onSelectUser(userId);
    setIsMobileOpen(false);
  };

  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3 lg:sticky lg:top-6">
      <button
        type="button"
        onClick={() => setIsMobileOpen((previous) => !previous)}
        aria-expanded={isMobileOpen}
        aria-controls={listId}
        className="flex w-full items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-4 text-left lg:cursor-default lg:pointer-events-none"
      >
        <h3
          id="member-directory-heading"
          className="text-sm font-bold uppercase tracking-wider text-slate-500"
        >
          Member Directory
        </h3>
        <FiChevronDown
          aria-hidden="true"
          className={`text-slate-500 transition-transform lg:hidden ${
            isMobileOpen ? 'rotate-180' : ''
          }`}
          size={18}
        />
      </button>

      <div
        id={listId}
        role="listbox"
        aria-labelledby="member-directory-heading"
        className={`flex-col ${isMobileOpen ? 'flex' : 'hidden'} lg:flex`}
      >
        {users.length === 0 ? (
          <p className="px-4 py-5 text-sm font-medium text-slate-500">No members available.</p>
        ) : (
          users.map((user) => {
            const isActive = user.id === selectedUserId;

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectUser(user.id)}
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
