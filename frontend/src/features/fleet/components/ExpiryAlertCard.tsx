import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { type ExpiringDocItem } from '../services/fleetService';
import { Badge } from '../../../components/ui/Badge';

// Helper function to format the date simply if formatDateTime isn't suitable for plain dates
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export interface ExpiryAlertCardProps {
  items: ExpiringDocItem[];
  isLoading: boolean;
  onDaysChange: (days: number) => void;
}

export function ExpiryAlertCard({
  items,
  isLoading,
  onDaysChange,
}: ExpiryAlertCardProps) {
  const [activeDays, setActiveDays] = useState<number>(30);

  const handleTabClick = (days: number) => {
    setActiveDays(days);
    onDaysChange(days);
  };

  const getUrgencyColor = (dateStr: string) => {
    const expiryDate = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((expiryDate - now) / (1000 * 3600 * 24));

    if (diffDays <= 7) return 'text-red-600 font-semibold';
    if (diffDays <= 30) return 'text-amber-600 font-medium';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="text-base font-semibold text-gray-900">
            Document Expiry Alerts
          </h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
          {[7, 30, 60].map((days) => (
            <button
              key={days}
              onClick={() => handleTabClick(days)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeDays === days
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">All clear!</p>
            <p className="text-sm text-gray-500 mt-1">
              No documents expiring in this period.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.vehicle_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 transition-colors"
              >
                {/* Left side: Vehicle Info */}
                <div className="flex flex-col items-start gap-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.brand} {item.model}
                  </p>
                  <Badge variant="neutral">
                    {item.branch_tag}
                  </Badge>
                </div>

                {/* Right side: Expiring Docs */}
                <div className="flex flex-col items-start sm:items-end gap-1">
                  {item.expiring.map((doc, idx) => (
                    <p key={idx} className="text-xs">
                      <span className="text-gray-600 mr-1 capitalize">
                        {doc.doc_type.replace('_', ' ')}:
                      </span>
                      <span className={getUrgencyColor(doc.expiry_date)}>
                        {formatDate(doc.expiry_date)}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}