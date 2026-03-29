// src/pages/dashboard/KycReviewPage.tsx

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Loader2 
} from 'lucide-react';
import { useKycReview } from '../../features/kyc/hooks/useKycReview';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Badge } from '../../components/ui/Badge';
import { formatDateTime } from '../../utils/vehicleHelpers';

export default function KycReviewPage() {
  const { 
    users, 
    isLoading, 
    error, 
    isReviewing, 
    reviewError, 
    review 
  } = useKycReview();
  usePageTitle('KYC Review');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [decision, setDecision] = useState<'verified' | 'failed' | null>(null);
  const [reason, setReason] = useState<string>('');

  const handleInitiateReview = (userId: string, action: 'verified' | 'failed') => {
    setActiveId(userId);
    setDecision(action);
    setReason('');
  };

  const handleCancel = () => {
    setActiveId(null);
    setDecision(null);
    setReason('');
  };

  const handleConfirm = async (userId: string) => {
    if (!decision) return;
    try {
      await review(userId, decision, reason);
      handleCancel();
    } catch {
      // Error is caught and set in the hook's reviewError state
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">KYC Review</h1>
          {/* SAFETY CHECK ADDED HERE */}
          {!isLoading && Array.isArray(users) && users.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              {users.length} Pending
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 2. USER LIST */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (!Array.isArray(users) || users.length === 0) && !error ? (
        /* SAFETY CHECK ADDED ABOVE (!Array.isArray) */
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-900 font-medium text-lg">All Caught Up!</p>
          <p className="text-sm text-gray-500 mt-1">No pending KYC reviews at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SAFETY CHECK ADDED HERE BEFORE .map() */}
          {Array.isArray(users) && users.map((user) => {
            const u = user as unknown as { user_id?: string; id?: string };
            const userId = u.user_id || u.id || '';
            const isCardActive = activeId === userId;

            return (
              <div key={userId} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: User Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
                      {getInitials(user.full_name)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{user.full_name || 'Unknown User'}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{user.phone_number || 'No phone'}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">Joined: {formatDateTime(user.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col sm:items-end gap-3">
                    <Badge variant="warning">needs_review</Badge>
                    
                    {!isCardActive && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleInitiateReview(userId, 'verified')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleInitiateReview(userId, 'failed')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Review Action Panel */}
                {isCardActive && (
                  <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6 rounded-b-xl">
                    <div className="max-w-xl">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason / Notes {decision === 'verified' ? '(Optional)' : '(Recommended)'}
                      </label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={decision === 'verified' ? "Looks good..." : "e.g., ID document is blurry"}
                        className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 mb-3"
                      />
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleConfirm(userId)}
                          disabled={isReviewing}
                          className={`inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            decision === 'verified' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Confirm {decision === 'verified' ? 'Approval' : 'Rejection'}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={isReviewing}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>

                      {reviewError && (
                        <p className="mt-3 text-xs text-red-600">{reviewError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}