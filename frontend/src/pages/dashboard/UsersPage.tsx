// src/pages/dashboard/UsersPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Eye, Loader2 } from 'lucide-react';
import { useUsers } from '../../features/admin/hooks/useUsers';
import { formatDateTime } from '../../utils/vehicleHelpers';
import type { UserRole, KYCStatus, AdminUserListItem } from '../../types';

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const getKycBadgeClasses = (status: KYCStatus) => {
  switch (status) {
    case 'verified':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'pending':
    case 'needs_review':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

export default function UsersPage() {
  const navigate = useNavigate();
  const {
    users,
    total,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setFilters,
    suspend,
    changeRole,
  } = useUsers();

  const [roleUpdating, setRoleUpdating] = useState<Record<string, boolean>>({});
  const [roleSuccess, setRoleSuccess] = useState<Record<string, boolean>>({});
  const [suspendUpdating, setSuspendUpdating] = useState<Record<string, boolean>>({});
  const [suspendError, setSuspendError] = useState<Record<string, string | null>>({});

    const handleRoleChange = async (userId: string, newRole: string) => {
        setRoleUpdating((prev) => ({ ...prev, [userId]: true }));
        try {
        await changeRole(userId, newRole as UserRole);
        setRoleSuccess((prev) => ({ ...prev, [userId]: true }));
        setTimeout(() => {
            setRoleSuccess((prev) => ({ ...prev, [userId]: false }));
        }, 1500);
        } catch {
        // Error handled silently for inline role select; could add toast here in future
        } finally {
        setRoleUpdating((prev) => ({ ...prev, [userId]: false }));
        }
    };

  const handleSuspendToggle = async (user: AdminUserListItem) => {
    setSuspendUpdating((prev) => ({ ...prev, [user.user_id]: true }));
    setSuspendError((prev) => ({ ...prev, [user.user_id]: null }));
    try {
      await suspend(user.user_id, !user.is_suspended);
    } catch (err) {
      const e = err as { message?: string };
      setSuspendError((prev) => ({
        ...prev,
        [user.user_id]: e.message || 'Update failed',
      }));
    } finally {
      setSuspendUpdating((prev) => ({ ...prev, [user.user_id]: false }));
    }
  };

  const hasActiveFilters = filters.role || filters.kyc_status || filters.is_suspended !== undefined;

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-gray-900" />
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {total} users
          </span>
        </div>
      </div>

      {/* 2. FILTER BAR */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">Role</label>
          <select
            className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            value={filters.role || ''}
            onChange={(e) => {
              setFilters({ ...filters, role: e.target.value || undefined });
              setPage(1);
            }}
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">KYC Status</label>
          <select
            className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            value={filters.kyc_status || ''}
            onChange={(e) => {
              setFilters({ ...filters, kyc_status: e.target.value || undefined });
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="failed">Failed</option>
            <option value="needs_review">Needs Review</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">Account Status</label>
          <select
            className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            value={filters.is_suspended !== undefined ? String(filters.is_suspended) : ''}
            onChange={(e) => {
              const val = e.target.value;
              setFilters({
                ...filters,
                is_suspended: val === '' ? undefined : val === 'true',
              });
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="false">Active</option>
            <option value="true">Suspended</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors h-[38px]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 3. USERS TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 && !error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">No items found.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.user_id}
                    className={`transition-colors ${
                      roleSuccess[user.user_id] ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {getInitials(user.full_name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{user.full_name}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                          <span className="text-xs text-gray-400">{user.phone_number || 'No phone'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <select
                          className="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          value={user.role}
                          disabled={roleUpdating[user.user_id]}
                          onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                        >
                          <option value="customer">Customer</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                        {roleUpdating[user.user_id] && (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getKycBadgeClasses(
                          user.kyc_status
                        )}`}
                      >
                        {user.kyc_status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        {user.is_suspended ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 mb-1">
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 mb-1">
                            Active
                          </span>
                        )}
                        {suspendUpdating[user.user_id] ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-2" />
                        ) : (
                          <button
                            onClick={() => handleSuspendToggle(user)}
                            className={`text-[10px] px-2 py-1 rounded border font-medium transition-colors ${
                              user.is_suspended
                                ? 'border-green-600 text-green-600 hover:bg-green-50'
                                : 'border-red-600 text-red-600 hover:bg-red-50'
                            }`}
                          >
                            {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        )}
                        {suspendError[user.user_id] && (
                          <span className="text-[10px] text-red-600 mt-0.5">
                            {suspendError[user.user_id]}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-gray-500">
                        {formatDateTime(user.created_at)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/dashboard/users/${user.user_id}`)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors inline-flex items-center"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PAGINATION */}
      {total > 20 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-xl shadow-sm sm:px-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-700 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}