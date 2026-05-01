import { useCallback, useMemo, useState } from 'react';
import type { AdminUserRecord } from '@/entities/user/types';
import {
  USERS_PAGE_SIZE,
  type UserStatusFilter,
} from '@/pages/adminpage/lib/adminConstants';

interface UseAdminUserFilterOptions {
  allUsers: AdminUserRecord[];
}

interface UseAdminUserFilterResult {
  statusFilter: UserStatusFilter;
  usersPage: number;
  filteredUsers: AdminUserRecord[];
  pagedUsers: AdminUserRecord[];
  maxPage: number;
  showingStart: number;
  showingEnd: number;
  handleToggleFilter: () => void;
  handlePreviousPage: () => void;
  handleNextPage: () => void;
}

/**
 * Holds the status-filter + pagination state for the admin all-users table.
 * Sorts newest-first by `createdAt` and clamps the current page whenever the
 * underlying filtered list shrinks.
 */
export default function useAdminUserFilter({
  allUsers,
}: UseAdminUserFilterOptions): UseAdminUserFilterResult {
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');
  const [usersPage, setUsersPage] = useState(0);

  const sortedAllUsers = useMemo(
    () => [...allUsers].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [allUsers],
  );

  const filteredUsers = useMemo(() => {
    if (statusFilter === 'active') {
      return sortedAllUsers.filter((user) => user.isAllowed);
    }

    if (statusFilter === 'inactive') {
      return sortedAllUsers.filter((user) => !user.isAllowed);
    }

    return sortedAllUsers;
  }, [sortedAllUsers, statusFilter]);

  const maxPage = Math.max(0, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE) - 1);
  const currentPage = Math.min(usersPage, maxPage);

  const pagedUsers = useMemo(() => {
    const start = currentPage * USERS_PAGE_SIZE;
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE);
  }, [currentPage, filteredUsers]);

  const showingStart = filteredUsers.length === 0 ? 0 : currentPage * USERS_PAGE_SIZE + 1;
  const showingEnd =
    filteredUsers.length === 0
      ? 0
      : Math.min((currentPage + 1) * USERS_PAGE_SIZE, filteredUsers.length);

  const handleToggleFilter = useCallback(() => {
    setStatusFilter((previous) => {
      if (previous === 'all') {
        return 'active';
      }

      if (previous === 'active') {
        return 'inactive';
      }

      return 'all';
    });
    setUsersPage(0);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setUsersPage(Math.max(0, currentPage - 1));
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    setUsersPage(Math.min(maxPage, currentPage + 1));
  }, [currentPage, maxPage]);

  return {
    statusFilter,
    usersPage: currentPage,
    filteredUsers,
    pagedUsers,
    maxPage,
    showingStart,
    showingEnd,
    handleToggleFilter,
    handlePreviousPage,
    handleNextPage,
  };
}
