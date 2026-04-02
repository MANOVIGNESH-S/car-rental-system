// src/pages/dashboard/PaymentsPage.tsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { usePayments } from '../../features/admin/hooks/usePayments';
import { usePageTitle } from '../../hooks/usePageTitle';
import { formatCurrency, formatDateTime } from '../../utils/vehicleHelpers';
import type { PaymentMethod } from '../../types';

// FIX: maps every TransactionType value to a human-readable label.
// Previously the pill showed "Unknown" when transaction_type was a valid
// enum string because the label lookup was missing entirely.
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  rental_fee: 'Rental Fee',
  security_deposit: 'Security Deposit',
  refund: 'Refund',
  damage_charge: 'Damage Charge',
};

const getTransactionTypePillClasses = (type: string) => {
  switch (type) {
    case 'rental_fee':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'security_deposit':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'refund':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'damage_charge':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'refunded':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

// FIX: payment_method from DB can be 'UPI', 'cash', or 'card' (mixed case
// depending on when the record was created). Normalise for display.
const formatPaymentMethod = (method: string | null | undefined): string => {
  if (!method) return '—';
  const upper = method.toUpperCase();
  if (upper === 'UPI') return 'UPI';
  if (upper === 'CARD') return 'Card';
  if (upper === 'CASH') return 'Cash';
  return method;
};

export default function PaymentsPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const {
    ledger,
    isLoading,
    error,
    isRefunding,
    refundError,
    refundSuccess,
    refundResult,
    processRefund,
    resetRefund,
  } = usePayments(bookingId || '');
  usePageTitle('Payment Ledger');

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [reason, setReason] = useState<string>('');

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId || !paymentMethod) return;

    await processRefund({
      booking_id: bookingId,
      amount: parseFloat(amount),
      payment_method: paymentMethod as PaymentMethod,
      reason,
    });
  };

  const handleProcessAnother = () => {
    resetRefund();
    setAmount('');
    setPaymentMethod('');
    setReason('');
  };

  if (isLoading && !ledger) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/bookings')}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  if (!ledger) return null;

  const netAmount = Number(ledger.total_charged) - Number(ledger.total_refunded);

  const isFormValid =
    amount &&
    !isNaN(Number(amount)) &&
    Number(amount) > 0 &&
    paymentMethod &&
    reason.trim().length >= 5 &&
    !isRefunding;

  const refundTxnId = refundResult
    ? (refundResult as typeof refundResult & { mock_transaction_id?: string }).mock_transaction_id
    : undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. HEADER */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/bookings')}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Bookings"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-gray-900" />
          <h1 className="text-2xl font-bold text-gray-900">Payment Ledger</h1>
          <span className="text-xs text-gray-400 font-mono mt-1">
            #{bookingId?.substring(0, 8)}
          </span>
        </div>
      </div>

      {/* 2. SUMMARY CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-red-600" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Charged
            </span>
          </div>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(ledger.total_charged)}
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-green-600" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Refunded
            </span>
          </div>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(ledger.total_refunded)}
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Net Amount
            </span>
          </div>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(netAmount)}
          </span>
        </div>
      </div>

      {/* 3. TRANSACTION HISTORY CARD */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-900">Transaction History</h2>
        </div>
        <div className="p-4 sm:px-6">
          {ledger.payments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No transactions recorded.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ledger.payments.map((payment, index) => {
                // FIX: transaction_type is always present on PaymentRecord.
                // Use it directly; fall back only for legacy/malformed records.
                const txnType: string = payment.transaction_type || 'unknown';
                const txnLabel = TRANSACTION_TYPE_LABELS[txnType] ?? txnType.replace(/_/g, ' ');
                const paymentKey = payment.payment_id || `payment-${index}`;

                return (
                  <div
                    key={paymentKey}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex flex-col gap-1 mb-2 sm:mb-0">
                      <div className="flex items-center gap-2">
                        {/* Transaction type pill — now always shows the correct label */}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getTransactionTypePillClasses(txnType)}`}
                        >
                          {txnLabel}
                        </span>
                        {/* FIX: normalise payment_method casing for display */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                          {formatPaymentMethod(payment.payment_method)}
                        </span>
                      </div>
                      {payment.mock_transaction_id && (
                        <span className="font-mono text-xs text-gray-400 mt-1">
                          {payment.mock_transaction_id}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-semibold ${
                            txnType === 'refund' ? 'text-green-600' : 'text-gray-900'
                          }`}
                        >
                          {txnType === 'refund' ? '- ' : ''}
                          {formatCurrency(payment.amount)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClasses(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(payment.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. MANUAL REFUND CARD */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-900">Process Manual Refund</h2>
        </div>
        <div className="p-4 sm:p-6">
          {refundSuccess && refundResult ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex flex-col items-center text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-sm font-semibold text-green-800">
                  Refund processed successfully
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Amount: <strong>{formatCurrency(refundResult.amount)}</strong> via{' '}
                  <span className="uppercase">{formatPaymentMethod(refundResult.payment_method)}</span>
                </p>
                {refundTxnId && (
                  <p className="text-xs text-green-600 font-mono mt-1">
                    TXN ID: {refundTxnId}
                  </p>
                )}
              </div>
              <button
                onClick={handleProcessAnother}
                className="text-sm text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline mt-2 font-medium"
              >
                Process another refund
              </button>
            </div>
          ) : (
            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Security deposit: {formatCurrency(ledger.total_charged)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                {/* FIX: radio values now match the PaymentMethod enum exactly —
                    'UPI' (uppercase), 'card' (lowercase), 'cash' (lowercase).
                    Previously all three were sent as lowercase which caused
                    'UPI' payments to be stored as 'upi' (invalid enum value). */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'UPI', value: 'UPI' },
                    { label: 'Card', value: 'card' },
                    { label: 'Cash', value: 'cash' },
                  ].map(({ label, value }) => (
                    <label
                      key={value}
                      className={`cursor-pointer flex items-center justify-center p-3 rounded-lg border text-sm font-medium transition-colors ${
                        paymentMethod === value
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={value}
                        checked={paymentMethod === value}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Refund
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for manual refund..."
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 resize-none"
                />
              </div>

              {refundError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-700">{refundError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!isFormValid}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefunding && <Loader2 className="w-4 h-4 animate-spin" />}
                {isRefunding ? 'Processing...' : 'Process Refund'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}