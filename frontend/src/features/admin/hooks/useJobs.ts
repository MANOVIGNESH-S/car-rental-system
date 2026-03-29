// src/features/admin/hooks/useJobs.ts

import { useState, useEffect, useCallback } from 'react';
import { getJobs, retryJob } from '../services/adminService';
import type { AsyncJob, JobStatus } from '../../../types';

interface JobsFilters {
  job_type?: string;
  status?: string;
}

export function useJobs() {
  const [jobs, setJobs] = useState<AsyncJob[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [filters, setFilters] = useState<JobsFilters>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchJobs = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const response = await getJobs({
        ...filters,
        page,
        limit: 20,
      });
      setJobs(response.jobs);
      setTotal(response.total);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to fetch jobs');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [page, filters]);

  // Initial fetch and fetch on page/filter change
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh polling for live jobs
  useEffect(() => {
    const hasLiveJobs = jobs.some(
      (job) => job.status === 'processing' || job.status === 'queued'
    );

    if (!hasLiveJobs) return;

    const intervalId = setInterval(() => {
      // Pass false to prevent loading spinner overlay during silent background refresh
      fetchJobs(false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [jobs, fetchJobs]);

  const retry = useCallback(async (jobId: string): Promise<void> => {
    setRetryingId(jobId);
    try {
      const response = await retryJob(jobId);
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.job_id === jobId
            ? {
                ...job,
                status: 'queued' as JobStatus,
                retry_count: response.retry_count,
              }
            : job
        )
      );
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      throw new Error(e.response?.data?.detail || 'Failed to retry job');
    } finally {
      setRetryingId(null);
    }
  }, []);

  return {
    jobs,
    total,
    isLoading,
    error,
    page,
    setPage,
    filters,
    setFilters,
    refetch: fetchJobs,
    retry,
    retryingId,
  };
}