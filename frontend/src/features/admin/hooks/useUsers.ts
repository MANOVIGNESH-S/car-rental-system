// src/features/admin/hooks/useUsers.ts

import { useState, useEffect, useCallback } from 'react';
import { getUsers, suspendUser, updateUserRole } from '../services/adminService';
import type { AdminUserListItem, UserRole } from '../../../types';

interface UsersFilters {
  kyc_status?: string;
  role?: string;
  is_suspended?: boolean;
}

export function useUsers() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [filters, setFilters] = useState<UsersFilters>({});

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getUsers({
        ...filters,
        page,
        limit: 20,
      });
      setUsers(response.users);
      setTotal(response.total);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const suspend = useCallback(async (userId: string, isSuspended: boolean): Promise<void> => {
    try {
      await suspendUser(userId, isSuspended);
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.user_id === userId ? { ...user, is_suspended: isSuspended } : user
        )
      );
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      throw new Error(e.response?.data?.detail || 'Failed to suspend user');
    }
  }, []);

  const changeRole = useCallback(async (userId: string, role: UserRole): Promise<void> => {
    try {
      await updateUserRole(userId, role);
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.user_id === userId ? { ...user, role } : user
        )
      );
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      throw new Error(e.response?.data?.detail || 'Failed to update user role');
    }
  }, []);

  return {
    users,
    total,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setFilters,
    refetch: fetchUsers,
    suspend,
    changeRole,
  };
}