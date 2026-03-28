import { Link } from 'react-router-dom';
import { AlertCircle, XCircle } from 'lucide-react';
import {type KYCStatus } from '../../../types';

export interface KycStatusBannerProps {
  kycStatus: KYCStatus;
  compact?: boolean;
}

export const KycStatusBanner = ({ kycStatus, compact = false }: KycStatusBannerProps) => {
  if (kycStatus === 'verified') {
    return null;
  }

  if (compact) {
    if (kycStatus === 'pending') {
      return (
        <div className="flex items-center justify-between gap-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium truncate">Verification Required</span>
          </div>
          <Link 
            to="/portal/kyc" 
            className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap hover:underline underline-offset-2"
          >
            Verify
          </Link>
        </div>
      );
    }

    if (kycStatus === 'needs_review') {
      return (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-medium truncate">KYC Under Review</span>
        </div>
      );
    }

    if (kycStatus === 'failed') {
      return (
        <div className="flex items-center justify-between gap-3 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium truncate">KYC Failed</span>
          </div>
          <Link 
            to="/portal/kyc" 
            className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap hover:underline underline-offset-2"
          >
            Update
          </Link>
        </div>
      );
    }
  }

  // Full Version
  if (kycStatus === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-800">Identity Verification Required</h3>
            <p className="mt-1 text-sm text-amber-700 mb-4">
              You must verify your identity documents before you can book a vehicle.
            </p>
            <Link
              to="/portal/kyc"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Verify Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (kycStatus === 'needs_review') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">KYC Under Review</h3>
            <p className="mt-1 text-sm text-amber-700">
              Our team is reviewing your documents. We'll notify you once complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (kycStatus === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800">KYC Verification Failed</h3>
            <p className="mt-1 text-sm text-red-700 mb-4">
              Your verification was unsuccessful. Please check your documents and try again.
            </p>
            <Link
              to="/portal/kyc"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Re-upload Documents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
};