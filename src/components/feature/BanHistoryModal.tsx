import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface BanRecord {
  ban_id: string;
  banned_at: string;
  banned_by: string;
  banned_by_email: string;
  ban_reason: string;
  custom_reason?: string;
  banned_until?: string;
  is_active: boolean;
  notes?: string;
  updated_at: string;
  ban_duration_days?: number;
  ban_status: string;
}

interface BanHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerEmail: string;
}

const BanHistoryModal: React.FC<BanHistoryModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  customerEmail
}) => {
  const [banHistory, setBanHistory] = useState<BanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchBanHistory();
    }
  }, [isOpen, customerId]);

  const fetchBanHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_user_ban_history', {
        p_user_id: customerId
      });

      if (error) {
        console.error('Error fetching ban history:', error);
        setError('Failed to load ban history');
        return;
      }

      setBanHistory(data || []);
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getBanReasonLabel = (reason: string) => {
    const reasons: { [key: string]: string } = {
      fake_orders: 'Fake or fraudulent orders',
      payment_abuse: 'Payment abuse',
      frequent_cancellations: 'Frequent order cancellations',
      abusive_behavior: 'Abusive behavior',
      multiple_accounts: 'Multiple fake accounts',
      false_reports: 'False reports or scams',
      policy_violations: 'Policy violations',
      other: 'Other'
    };
    return reasons[reason] || reason;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (bannedUntil?: string) => {
    if (!bannedUntil) return 'Permanent';
    
    const until = new Date(bannedUntil);
    const now = new Date();
    
    if (until <= now) return 'Expired';
    
    return `Until ${formatDate(bannedUntil)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
                <i className="ri-history-line text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Ban History</h3>
                <p className="text-gray-600 mt-1">
                  <span className="font-medium">{customerName}</span> • {customerEmail}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <span className="ml-3 text-gray-600">Loading ban history...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-red-600 text-2xl"></i>
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Error Loading History</h4>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchBanHistory}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : banHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-shield-check-line text-green-600 text-2xl"></i>
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Clean Record</h4>
              <p className="text-gray-600">This customer has never been banned.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-gray-800">
                  {banHistory.length} Ban Record{banHistory.length !== 1 ? 's' : ''}
                </h4>
                <div className="text-sm text-gray-600">
                  Most recent first
                </div>
              </div>

              {banHistory.map((record, index) => (
                <div
                  key={record.ban_id}
                  className={`bg-gradient-to-r rounded-xl p-6 border-l-4 ${
                    record.is_active
                      ? 'from-red-50 to-red-25 border-red-500 border border-red-200'
                      : 'from-gray-50 to-gray-25 border-gray-400 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Status and Reason */}
                      <div className="flex items-center mb-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold mr-3 ${
                          record.is_active
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {record.is_active ? 'ACTIVE BAN' : 'INACTIVE'}
                        </div>
                        <span className="text-sm font-medium text-gray-800">
                          {getBanReasonLabel(record.ban_reason)}
                        </span>
                      </div>

                      {/* Custom Reason */}
                      {record.custom_reason && (
                        <div className="mb-3">
                          <span className="text-sm text-gray-600">
                            <i className="ri-information-line mr-1"></i>
                            {record.custom_reason}
                          </span>
                        </div>
                      )}

                      {/* Ban Message - Remove this section since it's not in our data */}
                      
                      {/* Notes */}
                      {record.notes && (
                        <div className="mb-3">
                          <span className="text-xs text-gray-500 font-medium">ADMIN NOTES:</span>
                          <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 font-medium">Banned:</span>
                          <div className="flex items-center mt-1">
                            <i className="ri-calendar-line text-gray-400 mr-2"></i>
                            <span className="text-gray-700">{formatDate(record.banned_at)}</span>
                          </div>
                          {record.banned_by_email && (
                            <div className="flex items-center mt-1">
                              <i className="ri-user-line text-gray-400 mr-2"></i>
                              <span className="text-gray-600">by {record.banned_by_email}</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-gray-500 font-medium">Duration:</span>
                          <div className="flex items-center mt-1">
                            <i className="ri-time-line text-gray-400 mr-2"></i>
                            <span className="text-gray-700">{formatDuration(record.banned_until)}</span>
                          </div>
                          <div className="mt-2">
                            <span className="text-gray-500 font-medium">Status:</span>
                            <div className="flex items-center mt-1">
                              <i className="ri-information-line text-gray-400 mr-2"></i>
                              <span className="text-gray-700">{record.ban_status}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Record Number */}
                    <div className="ml-4">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border-2 border-gray-300 text-sm font-bold text-gray-600">
                        {index + 1}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BanHistoryModal;