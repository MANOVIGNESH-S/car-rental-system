import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  ArrowLeft,
  RefreshCcw,
} from 'lucide-react';

import { useKYC } from '../../features/kyc/hooks/useKYC';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Badge } from '../../components/ui/Badge';
import { getKycStatusVariant } from '../../utils/vehicleHelpers';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the ISO date string is in the past (license expired). */
const isExpired = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
};

// ── Sub-components ────────────────────────────────────────────────────────────

const RequirementsBox = () => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mt-6">
    <h4 className="text-sm font-semibold text-gray-900 mb-3">
      Requirements for Successful Verification
    </h4>
    <ul className="space-y-2.5">
      {[
        'License must be valid and not expired',
        'Face must be clearly visible in selfie',
        'Documents must be in JPG or PNG format',
        'File size under 5MB each',
      ].map((req) => (
        <li key={req} className="flex items-center gap-2.5 text-sm text-gray-700">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          {req}
        </li>
      ))}
    </ul>
  </div>
);

interface FileInputProps {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  file: File | null;
  previewUrl: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const FileInputCard = ({
  id,
  label,
  description,
  icon: Icon,
  file,
  previewUrl,
  onChange,
  disabled,
}: FileInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) onChange(e.target.files[0]);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const baseClasses =
    'relative group border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[160px]';
  const stateClasses = file
    ? 'border-blue-400 bg-blue-50'
    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 bg-white';
  const disabledClasses = disabled
    ? 'opacity-60 cursor-not-allowed hover:border-gray-300 hover:bg-white'
    : '';

  return (
    <div
      className={`${baseClasses} ${stateClasses} ${disabledClasses}`}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        id={id}
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {previewUrl ? (
        <div className="w-full">
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className="w-full h-28 object-cover rounded-lg border border-gray-200"
          />
          <p className="mt-2 text-xs text-gray-600 truncate px-2">{file?.name}</p>
          {!disabled && (
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-gray-500 hover:text-red-600 hover:bg-white shadow-sm"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={`p-3 rounded-full ${file ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-100'}`}>
            <Icon className={`w-7 h-7 ${file ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-900">{label}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </>
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const KycPage = () => {
  const navigate = useNavigate();
  const { kycStatus, isLoadingStatus, isUploading, upload } = useKYC();
  usePageTitle('KYC Verification');

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const handleLicenseChange = (file: File | null) => {
    setLicenseFile(file);
    if (licensePreview) URL.revokeObjectURL(licensePreview);
    setLicensePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSelfieChange = (file: File | null) => {
    setSelfieFile(file);
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    setSelfiePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async () => {
    if (!licenseFile || !selfieFile) return;
    const success = await upload(licenseFile, selfieFile);
    if (success) {
      handleLicenseChange(null);
      handleSelfieChange(null);
      // Small delay so the toast is visible before navigating
      setTimeout(() => navigate('/portal'), 1200);
    }
  };

  const currentStatus = kycStatus?.kyc_status || 'pending';
  const licenseExpired = isExpired(kycStatus?.dl_expiry_date ?? null);

  const isVerified = currentStatus === 'verified';
  const isProcessing = currentStatus === 'needs_review';

  // Badge should reflect the real state — verified+expired is NOT "verified"
  const badgeStatus = isVerified && licenseExpired ? 'expired' : currentStatus;
  const badgeVariant = isVerified && licenseExpired ? 'danger' : getKycStatusVariant(currentStatus);
  const badgeLabel =
    badgeStatus === 'expired'
      ? 'License Expired'
      : badgeStatus === 'pending'
      ? 'Not Verified'
      : badgeStatus.replace('_', ' ');

  // Allow upload if: not processing AND (not verified OR license has expired)
  const canUpload = !isProcessing && !isLoadingStatus && (!isVerified || licenseExpired);

  if (isLoadingStatus && !kycStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Back to Home */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/portal')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>

      {/* HEADER */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-4 border border-blue-100">
          <ShieldCheck className="w-9 h-9 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Identity Verification (KYC)</h1>
        <p className="mt-2.5 text-base text-gray-600 max-w-lg mx-auto">
          Upload your documents to verify your identity and unlock vehicle booking capabilities.
        </p>
      </div>

      <div className="space-y-8">

        {/* STATUS CARD */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-5 pb-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Verification Status</h2>
            <Badge variant={badgeVariant}>
              {badgeLabel}
            </Badge>
          </div>

          {/* VERIFIED — license still valid */}
          {isVerified && !licenseExpired && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4 text-sm bg-gray-50 border border-gray-100 rounded-xl p-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">License Expires</p>
                  <p className="mt-0.5 font-semibold text-gray-950">{kycStatus?.dl_expiry_date || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Extracted Address</p>
                  <p className="mt-0.5 text-gray-900 leading-relaxed">{kycStatus?.extracted_address || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                You are verified and can book vehicles!
              </div>
            </div>
          )}

          {/* VERIFIED — but license expired, needs re-upload */}
          {isVerified && licenseExpired && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Your driving license has expired</p>
                <p className="mt-0.5 text-red-700">
                  Expired on {kycStatus?.dl_expiry_date}. Please upload a renewed license below to continue booking.
                </p>
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {isProcessing && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Verification in Progress</p>
                <p className="mt-0.5 text-amber-700">
                  Your documents are being reviewed. This usually takes 1–2 business days.
                </p>
              </div>
            </div>
          )}

          {/* PENDING */}
          {currentStatus === 'pending' && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
              You need to verify your identity to start booking vehicles.
            </div>
          )}

          {/* FAILED */}
          {currentStatus === 'failed' && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Verification Failed</p>
                <p className="mt-0.5 text-red-700">
                  Your documents could not be verified. Please re-upload clear, valid documents below.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* UPLOAD FORM */}
        {canUpload && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              {licenseExpired && isVerified ? (
                <>
                  <RefreshCcw className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Re-upload Documents</h2>
                </>
              ) : (
                <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <FileInputCard
                id="license_image"
                label="Driving License"
                description="Front side of your license"
                icon={FileText}
                file={licenseFile}
                previewUrl={licensePreview}
                onChange={handleLicenseChange}
                disabled={isUploading}
              />
              <FileInputCard
                id="selfie_image"
                label="Selfie Photo"
                description="Clear photo of your face"
                icon={Camera}
                file={selfieFile}
                previewUrl={selfiePreview}
                onChange={handleSelfieChange}
                disabled={isUploading}
              />
            </div>

            <RequirementsBox />

            <div className="mt-8">
              <button
                onClick={handleSubmit}
                disabled={!licenseFile || !selfieFile || isUploading}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : licenseExpired && isVerified ? (
                  'Submit Renewed License'
                ) : (
                  'Upload for Verification'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KycPage;