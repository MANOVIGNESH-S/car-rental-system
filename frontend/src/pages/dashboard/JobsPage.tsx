// src/pages/dashboard/JobsPage.tsx

import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Mail,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useJobs } from '../../features/admin/hooks/useJobs';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatDateTime } from '../../utils/vehicleHelpers';
import type { JobStatus } from '../../types';

const getJobTypeDetails = (type: string) => {
  switch (type) {
    case 'kyc_verification':
      return {
        label: 'KYC',
        icon: <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />,
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'damage_assessment':
      return {
        label: 'Damage',
        icon: <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />,
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'email_notification':
      return {
        label: 'Email',
        icon: <Mail className="w-3.5 h-3.5 mr-1.5" />,
        classes: 'bg-gray-100 text-gray-700 border-gray-200',
      };
    case 'vehicle_doc_extraction':
      return {
        label: 'Vehicle Docs',
        icon: <FileText className="w-3.5 h-3.5 mr-1.5" />,
        classes: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    default:
      return {
        label: type.replace('_', ' '),
        icon: null,
        classes: 'bg-gray-100 text-gray-600 border-gray-200',
      };
  }
};

const getStatusBadgeClasses = (status: JobStatus) => {
  switch (status) {
    case 'queued':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'processing':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

export default function JobsPage() {
  const {
    jobs,
    total,
    isLoading,
    page,
    setPage,
    filters,
    setFilters,
    retry,
    retryingId,
  } = useJobs();
  usePageTitle('Background Jobs');

  // 2. STATS CALCULATION
  const stats = {
    queued: jobs.filter((j) => j.status === 'queued').length,
    processing: jobs.filter((j) => j.status === 'processing').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  };

  const isLive = stats.queued > 0 || stats.processing > 0;
  const hasActiveFilters = filters.job_type || filters.status;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-gray-900" />
          <h1 className="text-2xl font-bold text-gray-900">Background Jobs</h1>
        </div>
        {isLive && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Live</span>
            <span className="text-xs text-gray-500">(auto-refreshes every 30s)</span>
          </div>
        )}
      </div>

      {/* 2. STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col">
          <span className="text-xl font-bold text-gray-900">{stats.queued}</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Queued</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col">
          <span className="text-xl font-bold text-amber-600">{stats.processing}</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Processing</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col">
          <span className="text-xl font-bold text-green-600">{stats.completed}</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Completed</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col">
          <span className="text-xl font-bold text-red-600">{stats.failed}</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Failed</span>
        </div>
      </div>

      {/* 3. FILTER BAR */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">Job Type</label>
          <select
            className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
            value={filters.job_type || ''}
            onChange={(e) => {
              setFilters({ ...filters, job_type: e.target.value || undefined });
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            <option value="kyc_verification">KYC Verification</option>
            <option value="damage_assessment">Damage Assessment</option>
            <option value="email_notification">Email Notification</option>
            <option value="vehicle_doc_extraction">Vehicle Docs Extraction</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">Status</label>
          <select
            className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            value={filters.status || ''}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value || undefined });
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
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

      {/* 4. JOBS TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retries</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Error</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading && jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Activity className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No jobs found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const typeDetails = getJobTypeDetails(job.job_type);
                  return (
                    <tr key={job.job_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-400">
                          {job.job_id.substring(0, 8)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeDetails.classes}`}
                        >
                          {typeDetails.icon}
                          {typeDetails.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-mono text-xs text-gray-900">
                            {job.reference_id.substring(0, 8)}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            {job.reference_type}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClasses(
                            job.status
                          )}`}
                        >
                          {job.status === 'processing' && (
                            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          )}
                          {job.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${
                            job.retry_count >= 3 ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {job.retry_count}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {job.last_error ? (
                          <span
                            title={job.last_error}
                            className="text-xs text-red-600 cursor-help border-b border-dotted border-red-300"
                          >
                            {job.last_error.length > 40
                              ? `${job.last_error.substring(0, 40)}...`
                              : job.last_error}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-500">
                          {formatDateTime(job.updated_at)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {job.is_stuck && job.status !== 'failed' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Stuck
                            </span>
                          )}
                          {(job.status === 'failed' || job.is_stuck) ? (
                            <button
                              onClick={() => retry(job.job_id)}
                              disabled={retryingId === job.job_id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {retryingId === job.job_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              Retry
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. PAGINATION */}
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