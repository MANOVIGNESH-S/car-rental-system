// src/pages/dashboard/DamagePage.tsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Image as ImageIcon,
  Info
} from 'lucide-react';
import { useDamage } from '../../features/damage/hooks/useDamage';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function DamagePage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { 
    damageLog, 
    isLoading, 
    error, 
    isResolving, 
    resolveError, 
    resolveResult, 
    resolve 
  } = useDamage(bookingId || '');
  usePageTitle('Damage Assessment');

  const [decision, setDecision] = useState<'clear' | 'charge' | null>(null);
  const [notes, setNotes] = useState('');
  const [damageAmount, setDamageAmount] = useState<string>('');

  const handleResolve = () => {
    if (!decision) return;
    resolve(decision, notes, decision === 'charge' ? Number(damageAmount) : undefined);
  };

  const getFuelColorClass = (level: number) => {
    if (level > 50) return 'bg-green-500';
    if (level > 20) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // ─── Validation ───────────────────────────────────────────────────────────
  const hasDecision   = decision !== null;
  const hasNotes      = notes.trim().length >= 10;
  const hasAmount     = decision !== 'charge' || Number(damageAmount) > 0;
  const isFormValid   = hasDecision && hasNotes && hasAmount;

  // Which validations are still missing (for inline hints)
  const missingItems: string[] = [];
  if (!hasDecision) missingItems.push('Select a resolution (Clear or Charge)');
  if (!hasNotes)    missingItems.push(`Add resolution notes (${notes.trim().length}/10 chars minimum)`);
  if (!hasAmount)   missingItems.push('Enter a damage amount greater than ₹0');

  // ─── Classification helpers ───────────────────────────────────────────────
  const cls = damageLog?.llm_classification;

  // Resolvable = only Amber / Red / needs_review (backend enforces this too)
  const isResolvable = cls === 'Amber' || cls === 'Red' || cls === 'needs_review';

  const classificationConfig = {
    Green: {
      bg:        'bg-green-50',
      border:    'border-green-200',
      icon:      <CheckCircle2 className="w-5 h-5 text-green-700 mt-0.5" />,
      label:     'text-green-800',
      badge:     'bg-green-100 text-green-700 border-green-200',
      heading:   'No significant damage detected',
      sub:       'The AI assessment found no new damage. The security deposit will be refunded in full — no admin action is required.',
      badgeText: 'Green',
    },
    Amber: {
      bg:        'bg-amber-50',
      border:    'border-amber-200',
      icon:      <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />,
      label:     'text-amber-800',
      badge:     'bg-amber-100 text-amber-700 border-amber-200',
      heading:   'Minor damage detected — review required',
      sub:       'The AI flagged possible minor damage. Review the images below and decide whether to clear the deposit or deduct a charge.',
      badgeText: 'Amber',
    },
    Red: {
      bg:        'bg-red-50',
      border:    'border-red-200',
      icon:      <AlertTriangle className="w-5 h-5 text-red-700 mt-0.5" />,
      label:     'text-red-800',
      badge:     'bg-red-100 text-red-700 border-red-200',
      heading:   'Significant damage detected',
      sub:       'The AI has flagged significant damage. Review the pre/post images and resolve the claim below.',
      badgeText: 'Red',
    },
    needs_review: {
      bg:        'bg-amber-50',
      border:    'border-amber-200',
      icon:      <Info className="w-5 h-5 text-amber-700 mt-0.5" />,
      label:     'text-amber-800',
      badge:     'bg-amber-100 text-amber-700 border-amber-200',
      heading:   'Manual review required',
      sub:       'The AI could not reach a confident conclusion. Please inspect the images carefully and resolve the claim manually.',
      badgeText: 'Manual Review',
    },
  } as const;

  type ClsKey = keyof typeof classificationConfig;

  // ─── Loading / Error guards ───────────────────────────────────────────────
  if (isLoading && !damageLog) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!damageLog) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
        <p className="text-sm text-gray-500">Damage log not found.</p>
      </div>
    );
  }

  const config = cls ? classificationConfig[cls as ClsKey] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* 1. HEADER */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard/bookings')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Damage Assessment</h1>
          <p className="text-xs text-gray-400 mt-1">
            Booking ID: #{bookingId?.substring(0, 8)}
          </p>
        </div>
      </div>

      {/* 2. DAMAGE CLASSIFICATION CARD */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Assessment Status</h2>
        
        {config ? (
          <div className={`p-4 rounded-lg border flex items-start gap-3 ${config.bg} ${config.border}`}>
            {config.icon}
            <div>
              <p className={`text-sm font-medium ${config.label}`}>
                {config.heading}
              </p>
              <p className={`text-xs mt-1 ${config.label} opacity-80`}>
                {config.sub}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.badge}`}>
                  {config.badgeText}
                </span>
                {damageLog.damage_job && (
                  <span className="text-xs text-gray-500">
                    Assessment Job: {(damageLog.damage_job as { status?: string }).status || 'Processed'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm">Damage assessment in progress...</span>
          </div>
        )}
      </div>

      {/* 3. FUEL COMPARISON CARD */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Fuel Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-700 font-medium">Fuel at Pickup</span>
              <span className="text-sm font-semibold text-gray-900">{damageLog.fuel_level_at_pickup ?? 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getFuelColorClass(damageLog.fuel_level_at_pickup ?? 0)}`}
                style={{ width: `${damageLog.fuel_level_at_pickup ?? 0}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-700 font-medium">Fuel at Return</span>
              <span className="text-sm font-semibold text-gray-900">{damageLog.fuel_level_at_return ?? 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getFuelColorClass(damageLog.fuel_level_at_return ?? 0)}`}
                style={{ width: `${damageLog.fuel_level_at_return ?? 0}%` }}
              />
            </div>
          </div>
        </div>
        
        {((damageLog.fuel_level_at_pickup ?? 0) - (damageLog.fuel_level_at_return ?? 0)) > 20 && (
          <div className="mt-4 flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Fuel level significantly lower at return.</span>
          </div>
        )}
      </div>

      {/* 4. IMAGE COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-gray-500" />
            Pre-Rental Condition
          </h2>
          {!damageLog.pre_rental_image_urls || damageLog.pre_rental_image_urls.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-xs text-gray-500">No pre-rental images uploaded</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {damageLog.pre_rental_image_urls.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                  <img 
                    src={url} 
                    alt={`Pre-rental ${idx + 1}`} 
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-gray-500" />
            Post-Rental Condition
          </h2>
          {!damageLog.post_rental_image_urls || damageLog.post_rental_image_urls.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-xs text-gray-500">Awaiting post-rental images</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {damageLog.post_rental_image_urls.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                  <img 
                    src={url} 
                    alt={`Post-rental ${idx + 1}`} 
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5a. GREEN INFO BANNER — no admin action needed */}
      {cls === 'Green' && !resolveResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6 shadow-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">No resolution action required</p>
            <p className="text-xs text-green-700 mt-1">
              This booking has a <strong>Green</strong> classification — the AI found no new damage.
              The security deposit refund is handled automatically. No further action is needed.
            </p>
          </div>
        </div>
      )}

      {/* 5b. RESOLUTION PANEL — only shown for Amber / Red / needs_review */}
      {isResolvable && !resolveResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Resolve Damage Claim</h2>
          <p className="text-xs text-gray-500 mb-4">
            {cls === 'Amber'        && 'Minor damage was flagged. Review carefully before deciding.'}
            {cls === 'Red'          && 'Significant damage was detected. Choose how to handle the security deposit.'}
            {cls === 'needs_review' && 'AI could not decide automatically. Inspect and resolve manually.'}
          </p>

          {resolveError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">{resolveError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setDecision('clear')}
              className={`text-left p-4 rounded-xl border-2 transition-colors ${
                decision === 'clear' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className={`w-5 h-5 ${decision === 'clear' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900 text-sm">Clear — No Charge</span>
              </div>
              <p className="text-xs text-gray-500 pl-7">Return security deposit in full</p>
            </button>

            <button
              type="button"
              onClick={() => setDecision('charge')}
              className={`text-left p-4 rounded-xl border-2 transition-colors ${
                decision === 'charge' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`w-5 h-5 ${decision === 'charge' ? 'text-red-600' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900 text-sm">Charge Customer</span>
              </div>
              <p className="text-xs text-gray-500 pl-7">Deduct damage amount from deposit</p>
            </button>
          </div>

          <div className="space-y-4">
            {decision === 'charge' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Damage Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                  <input 
                    type="number"
                    min="1"
                    value={damageAmount}
                    onChange={(e) => setDamageAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                    placeholder="Enter amount to deduct"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Notes
                <span className={`ml-2 text-xs font-normal ${notes.trim().length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                  ({notes.trim().length}/10 min)
                </span>
              </label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                placeholder="Add resolution notes (min 10 characters)..."
              />
            </div>

            <button 
              onClick={handleResolve}
              disabled={!isFormValid || isResolving}
              className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResolving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Resolve Claim'
              )}
            </button>

            {/* ── Inline validation hints — only shown when form is incomplete ── */}
            {!isFormValid && missingItems.length > 0 && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">
                  Complete the following to enable submission:
                </p>
                <ul className="space-y-0.5">
                  {missingItems.map((item, i) => (
                    <li key={i} className="text-xs text-blue-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. RESOLUTION RESULT CARD */}
      {resolveResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold text-green-800">Claim Resolved</h2>
          </div>
          <div className="space-y-2 text-sm text-green-900">
            <p><span className="font-medium">Resolution:</span> {resolveResult.resolution}</p>
            <p><span className="font-medium">Damage Charged:</span> {resolveResult.damage_amount ? `₹${resolveResult.damage_amount}` : 'None'}</p>
            <p><span className="font-medium">Refund Issued:</span> {resolveResult.refund_amount ? `₹${resolveResult.refund_amount}` : 'None'}</p>
            {resolveResult.payment_records_created && resolveResult.payment_records_created.length > 0 && (
              <p className="text-xs text-green-700 mt-2">
                Generated {resolveResult.payment_records_created.length} payment record(s).
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}