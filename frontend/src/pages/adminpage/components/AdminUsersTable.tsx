import { memo } from 'react';
import EditDeleteButton from '@/common/components/EditDeleteButton';
import type { AdminUserRecord } from '@/entities/user/types';
import AdminUserAvatar from '@/pages/adminpage/AdminUserAvatar';
import AdminAuthProviderBadge from '@/pages/adminpage/components/AdminAuthProviderBadge';
import {
  USER_STATUS_FILTER_LABEL,
  type UserStatusFilter,
} from '@/pages/adminpage/lib/adminConstants';
import {
  formatCount,
  formatJoinedDate,
  getEmailVerificationMeta,
} from '@/pages/adminpage/lib/adminFormatters';

interface AdminUsersTableProps {
  pagedUsers: AdminUserRecord[];
  filteredUsersCount: number;
  isLoading: boolean;
  statusFilter: UserStatusFilter;
  currentUserId: number | undefined;
  deletingUserId: number | null;
  removingProfileImageUserId: number | null;
  usersPage: number;
  maxPage: number;
  showingStart: number;
  showingEnd: number;
  onToggleFilter: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onEditUser: (user: AdminUserRecord) => void;
  onDeleteUser: (user: AdminUserRecord) => void;
  onDeleteProfileImage: (user: AdminUserRecord) => void;
}

function AdminUsersTable({
  pagedUsers,
  filteredUsersCount,
  isLoading,
  statusFilter,
  currentUserId,
  deletingUserId,
  removingProfileImageUserId,
  usersPage,
  maxPage,
  showingStart,
  showingEnd,
  onToggleFilter,
  onPreviousPage,
  onNextPage,
  onEditUser,
  onDeleteUser,
  onDeleteProfileImage,
}: AdminUsersTableProps) {
  return (
    <section>
      <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <span aria-hidden="true" className="text-amber-400">
            ⚙
          </span>
          All Users
        </h2>

        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={onToggleFilter}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50 sm:flex-none"
          >
            <span aria-hidden="true">☰</span>
            <span>{`Filter (${USER_STATUS_FILTER_LABEL[statusFilter]})`}</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th
                  scope="col"
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Member
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Sign-up Method
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Email Verification
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Joined
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-sm font-medium text-slate-500"
                    >
                    Loading users...
                  </td>
                </tr>
              ) : pagedUsers.length === 0 ? (
                <tr>
                  <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-sm font-medium text-slate-500"
                    >
                    No users found for this filter.
                  </td>
                </tr>
              ) : (
                pagedUsers.map((user) => {
                  const roleLabel = user.isAdmin ? 'Moderator' : 'Member';
                  const statusLabel = user.isAllowed ? 'Active' : 'Inactive';
                  const statusTextClassName = user.isAllowed
                    ? 'text-emerald-600'
                    : 'text-slate-400';
                  const statusDotClassName = user.isAllowed ? 'bg-emerald-500' : 'bg-slate-300';
                  const verificationMeta = getEmailVerificationMeta(user.emailVerifiedAt);
                  const isCurrentAdminUser = currentUserId === user.id;
                  const isRemovingProfileImage = removingProfileImageUserId === user.id;

                  return (
                    <tr key={user.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AdminUserAvatar
                            userId={user.id}
                            name={user.name}
                            profileImage={user.profileImage}
                          />
                          <div>
                            <p className="font-bold text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">
                          {roleLabel}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div
                          className={`flex items-center gap-1.5 text-sm font-medium ${statusTextClassName}`}
                        >
                          <span className={`size-2 rounded-full ${statusDotClassName}`} />
                          {statusLabel}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <AdminAuthProviderBadge provider={user.authProvider} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${verificationMeta.className}`}
                          >
                            <span
                              aria-hidden="true"
                              className={`size-2 rounded-full ${verificationMeta.dotClassName}`}
                            />
                            {verificationMeta.label}
                          </span>
                          <span className="text-xs text-slate-500">{verificationMeta.detail}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatJoinedDate(user.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {user.profileImage ? (
                            <button
                              type="button"
                              disabled={isRemovingProfileImage || deletingUserId === user.id}
                              onClick={() => onDeleteProfileImage(user)}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isRemovingProfileImage ? 'Removing photo...' : 'Remove photo'}
                            </button>
                          ) : null}

                          <EditDeleteButton
                            onEditClick={() => onEditUser(user)}
                            onDeleteClick={() => onDeleteUser(user)}
                            isDeleting={deletingUserId === user.id}
                            isDeleteDisabled={
                              deletingUserId !== null ||
                              isCurrentAdminUser ||
                              isRemovingProfileImage
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-500">
            {`Showing ${showingStart}-${showingEnd} of ${formatCount(filteredUsersCount)} members`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={usersPage === 0}
              className="rounded border border-slate-200 p-2 transition-colors hover:bg-slate-50 disabled:opacity-50"
              aria-label="Previous users page"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={usersPage >= maxPage}
              className="rounded border border-slate-200 p-2 transition-colors hover:bg-slate-50 disabled:opacity-50"
              aria-label="Next users page"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(AdminUsersTable);
