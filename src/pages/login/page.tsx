
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/base/Button';
import Input from '../../components/base/Input';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      if (result.success && result.user) {
        // Redirect based on user role
        if (result.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        setError(result.error || 'Failed to sign in');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(239, 68, 68, 0.1)), url('https://readdy.ai/api/search-image?query=modern%20restaurant%20interior%20with%20warm%20lighting%2C%20elegant%20dining%20atmosphere%2C%20blurred%20background%2C%20cozy%20ambiance%2C%20food%20service%20environment&width=1200&height=800&seq=loginbg&orientation=landscape')`
      }}
    >
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 w-10 h-10 bg-white/80 backdrop-blur-sm hover:bg-white border border-orange-200 hover:border-orange-300 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
        >
          <i className="ri-arrow-left-line text-xl text-orange-600" />
        </button>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-orange-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-user-line text-2xl text-orange-500" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
            <p className="text-gray-600">Sign in to your account to continue ordering</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <i className="ri-error-warning-line text-red-500"></i>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon="ri-mail-line"
                className="w-full pl-12 pr-4 py-4 text-base bg-white/70 backdrop-blur-sm border-orange-200 focus:border-orange-400 focus:ring-orange-200 rounded-2xl shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon="ri-lock-line"
                className="w-full pl-12 pr-4 py-4 text-base bg-white/70 backdrop-blur-sm border-orange-200 focus:border-orange-400 focus:ring-orange-200 rounded-2xl shadow-sm"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Signing In...
                </div>
              ) : (
                <>
                  <i className="ri-login-box-line mr-3" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500 bg-white">or</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">Don't have an account?</p>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center w-full py-3 px-6 text-base font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 rounded-2xl transition-all duration-300 cursor-pointer"
            >
              <i className="ri-user-add-line mr-2" />
              Create New Account
            </Link>
          </div>

          {/* Demo Accounts */}
          <div className="mt-8 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border border-orange-100">
            <h4 className="font-semibold text-gray-900 mb-3 text-center">Demo Accounts</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Customer:</span>
                <span className="font-mono text-gray-800">customer@demo.com / demo123</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Admin:</span>
                <span className="font-mono text-gray-800">admin@demo.com / admin123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
