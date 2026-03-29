import { useState } from 'react';
import { Pencil, LogOut, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useProfile } from '../../features/profile/hooks/useProfile';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { KycStatusBanner } from '../../features/kyc/components/KycStatusBanner';
import { formatDateTime } from '../../utils/vehicleHelpers';

const ProfilePage = () => {
  const { logout } = useAuth();
  const {
    profile,
    isLoading,
    error,
    isUpdating,
    updateProfile,
  } = useProfile();
  usePageTitle('My Profile');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleEditClick = () => {
    if (profile) {
      setEditName(profile.full_name || '');
      setEditPhone(profile.phone_number || '');
      setValidationError(null);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setValidationError(null);
  };

  const handleSave = async () => {
    setValidationError(null);

    if (editName.trim().length < 2) {
      setValidationError('Full name must be at least 2 characters long.');
      return;
    }
    if (editPhone.trim().length < 10) {
      setValidationError('Phone number must be at least 10 characters long.');
      return;
    }

    const success = await updateProfile({
      full_name: editName.trim(),
      phone_number: editPhone.trim(),
    });

    if (success) {
      setIsEditing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error || 'Failed to load profile.'}</p>
        </div>
      </div>
    );
  }

  const userInitial = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      
      {/* 1. PROFILE HEADER CARD */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex items-center gap-5">
        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
          <span className="text-2xl font-bold text-white">{userInitial}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{profile.full_name}</h1>
          <p className="text-sm text-blue-100 mt-0.5">{profile.email}</p>
          <div className="mt-2.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white border border-white/10 backdrop-blur-sm shadow-sm">
              {profile.role.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. KYC STATUS CARD */}
      <div className="space-y-4">
        <KycStatusBanner kycStatus={profile.kyc_status} />
        {profile.kyc_status === 'verified' && profile.dl_expiry_date && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Identity Verified</p>
              <p className="text-sm text-green-700 mt-0.5">License valid until {profile.dl_expiry_date}</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. ACCOUNT DETAILS CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>
          {!isEditing && (
            <button
              onClick={handleEditClick}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors shadow-sm"
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-5">
            {validationError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 disabled:opacity-60 disabled:bg-gray-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 disabled:opacity-60 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm min-w-[140px]"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-y-6 gap-x-8">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Full Name</p>
              <p className="text-sm text-gray-900 font-medium">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email Address</p>
              <p className="text-sm text-gray-900 font-medium">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone Number</p>
              <p className="text-sm text-gray-900 font-medium">{profile.phone_number || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Member Since</p>
              <p className="text-sm text-gray-900 font-medium">{formatDateTime(profile.created_at)}</p>
            </div>
          </div>
        )}
      </div>

      {/* 4. DANGER ZONE CARD */}
      <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Options</h2>
        <p className="text-sm text-gray-500 mb-5">Sign out of your account on this device.</p>
        <button
          onClick={logout}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-200 transition-colors shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign out of your account
        </button>
      </div>

    </div>
  );
};

export default ProfilePage;