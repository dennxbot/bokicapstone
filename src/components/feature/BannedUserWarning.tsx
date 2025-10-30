import { useNavigate } from 'react-router-dom';
import Button from '../base/Button';

interface BannedUserWarningProps {
  banReason?: string;
  customReason?: string;
  bannedUntil?: string;
  banMessage?: string;
  onLogout: () => void;
}

const BannedUserWarning = ({ banReason, customReason, bannedUntil, banMessage, onLogout }: BannedUserWarningProps) => {
  const navigate = useNavigate();

  const formatBanReason = (reason: string, custom?: string) => {
    if (reason === 'other' && custom) return custom;
    
    const reasonMap: { [key: string]: string } = {
      'fake_orders': 'Placing fake orders',
      'payment_abuse': 'Payment system abuse',
      'frequent_cancellations': 'Frequent order cancellations',
      'abusive_behavior': 'Abusive behavior towards staff',
      'multiple_fake_accounts': 'Creating multiple fake accounts',
      'false_reports': 'False reports or scams',
      'policy_violations': 'Policy violations'
    };
    
    return reasonMap[reason] || reason;
  };

  const handleGoHome = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl border border-red-100 p-8 text-center">
          {/* Warning Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-forbid-line text-3xl text-white"></i>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Account Suspended
          </h1>

          {/* Ban Details */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            {banMessage ? (
              <p className="text-red-800 leading-relaxed">{banMessage}</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-1">Reason:</p>
                  <p className="text-red-800">{formatBanReason(banReason || '', customReason)}</p>
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-1">Duration:</p>
                  <p className="text-red-800">
                    {bannedUntil 
                      ? `Temporary ban until ${new Date(bannedUntil).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}`
                      : 'Permanent ban'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Message */}
          {!banMessage && (
            <p className="text-gray-600 mb-6 leading-relaxed">
              Your account has been suspended due to violations of our terms of service. 
              {bannedUntil 
                ? ' You will be able to access your account again after the ban period expires.'
                : ' Please contact our support team if you believe this is an error.'
              }
            </p>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleGoHome}
              className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-2xl font-semibold transition-all duration-300"
            >
              <i className="ri-home-line mr-2"></i>
              Return to Homepage
            </Button>
            
            <a
              href="mailto:support@boki.com"
              className="inline-flex items-center justify-center w-full py-3 text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 rounded-2xl font-semibold transition-all duration-300"
            >
              <i className="ri-customer-service-line mr-2"></i>
              Contact Support
            </a>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              For questions about your account status, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannedUserWarning;