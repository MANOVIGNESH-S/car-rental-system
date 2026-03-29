// src/features/admin/hooks/useUsers.ts

import { useState, useEffect, useCallback } from 'react';
import { getUsers, suspendUser, updateUserRole } from '../services/adminService';
import type { AdminUserListItem, UserRole } from '../../../types';
import { useToast } from '../../../context/ToastContext';

interface UsersFilters {
  kyc_status?: string;
  role?: string;
  is_suspended?: boolean;
}

export function useUsers() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [filters, setFilters] = useState<UsersFilters>({});
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
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
      const errorMessage = e.response?.data?.detail || 'An unexpected error occurred';
      toast.error('Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters, toast]);

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
      toast.success('User updated');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      const errorMessage = e.response?.data?.detail || 'An unexpected error occurred';
      toast.error('Failed', errorMessage);
    }
  }, [toast]);

  const changeRole = useCallback(async (userId: string, role: UserRole): Promise<void> => {
    try {
      await updateUserRole(userId, role);
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.user_id === userId ? { ...user, role } : user
        )
      );
      toast.success('Role updated');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      const errorMessage = e.response?.data?.detail || 'An unexpected error occurred';
      toast.error('Failed', errorMessage);
    }
  }, [toast]);

  return {
    users,
    total,
    isLoading,
    page,
    setPage,
    filters,
    setFilters,
    refetch: fetchUsers,
    suspend,
    changeRole,
  };
}