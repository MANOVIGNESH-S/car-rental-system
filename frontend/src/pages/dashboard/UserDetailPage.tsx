import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  MapPin,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { getUserById, type AdminUserDetail } from '../../features/admin/services/adminService';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatDateTime } from '../../utils/vehicleHelpers';

function DocImage({
  url,
  label,
}: {
  url: string | null;
  label: string;
}) {
  const [enlarged, setEnlarged] = useState(false);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-40 bg-gray-100 border border-dashed border-gray-300 rounded-xl text-gray-400 gap-2">
        <ImageIcon className="w-6 h-6" />
        <span className="text-xs">{label} not uploaded</span>
      </div>
    );
  }

  const isPdf = url.includes('.pdf') || url.includes('application%2Fpdf');

  if (isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center justify-center h-40 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 gap-2 hover:bg-blue-100 transition-colors"
      >
        <FileText className="w-7 h-7" />
        <span className="text-xs font-medium">View {label} (PDF)</span>
      </a>
    );
  }

  return (
    <>
      <div
        className="relative cursor-zoom-in group overflow-hidden rounded-xl border border-gray-200 bg-gray-100 h-40"
        onClick={() => setEnlarged(true)}
      >
        <img
          src={url}
          alt={label}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end p-2">
          <span className="text-[10px] font-medium bg-black/60 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            Click to enlarge
          </span>
        </div>
      </div>

      {enlarged && (
        <div
          className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setEnlarged(false)}
        >
          <img
            src={url}
            alt={label}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

const getKycBadgeClasses = (status: string) => {
  switch (status) {
    case 'verified': return 'bg-green-50 text-green-700 border-green-200';
    case 'failed':   return 'bg-red-50 text-red-700 border-red-200';
    default:         return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  usePageTitle('User Detail');

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    getUserById(userId)
      .then(setUser)
      .catch((err) => {
        const e = err as { response?: { data?: { detail?: string } }; message?: string };
        setError(e.response?.data?.detail || e.message || 'Failed to load user');
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-gray-700 font-medium">{error || 'User not found'}</p>
        <button
          onClick={() => navigate('/dashboard/users')}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          ← Back to Users
        </button>
      </div>
    );
  }

  const infoRows = [
    { icon: <Mail className="w-4 h-4" />, label: 'Email', value: user.email },
    { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: user.phone_number || '—' },
    { icon: <Shield className="w-4 h-4" />, label: 'Role', value: user.role },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: 'DL Expiry',
      value: user.dl_expiry_date
        ? new Date(user.dl_expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
    },
    {
      icon: <MapPin className="w-4 h-4" />,
      label: 'Address (from DL)',
      value: user.extracted_address || '—',
    },
    { icon: <Calendar className="w-4 h-4" />, label: 'Joined', value: formatDateTime(user.created_at) },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/users')}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Detail</h1>
          <p className="text-sm text-gray-500 mt-0.5">Full profile and KYC documents</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl flex-shrink-0">
            {user.full_name?.trim().split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getKycBadgeClasses(user.kyc_status)}`}
              >
                KYC: {user.kyc_status.replace('_', ' ')}
              </span>
              {user.is_suspended ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  Suspended
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  Active
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {infoRows.map(({ icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
              <div>
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="text-sm text-gray-900 mt-0.5 break-all">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KYC Documents */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">KYC Documents</h3>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Presigned URLs expire in 15 minutes. Refresh this page to regenerate them.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Selfie</p>
            <DocImage url={user.selfie_url} label="Selfie" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Driving Licence</p>
            <DocImage url={user.license_url} label="Driving Licence" />
          </div>
        </div>

        {!user.selfie_url && !user.license_url && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              This user has not uploaded KYC documents yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
