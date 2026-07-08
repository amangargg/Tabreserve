import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const { login, forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [resetMode, setResetMode] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const isExpired = searchParams.get('expired') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const loggedUser = await login({ email, password });
      if (loggedUser.role === 'owner') {
        navigate('/owner-dashboard');
      } else if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/restaurants');
      }
    } catch (err: any) {
      if (err.includes('not verified')) {
        // Redirect to OTP verification
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);
    
    try {
      await forgotPassword(email);
      setResetMessage('A reset OTP has been sent to your email.');
      setTimeout(() => {
        navigate(`/verify-otp?email=${encodeURIComponent(email)}&reset=true`);
      }, 2000);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24 sm:px-6 lg:px-8 bg-[#070a13] relative overflow-hidden">
      
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-[100px]"></div>

      <div className="max-w-md w-full space-y-8 glass-card p-8 rounded-2xl border border-gray-800 shadow-2xl relative z-10">
        <div>
          <h2 className="text-center text-3xl font-display font-extrabold text-white">
            {resetMode ? 'Reset Password' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Or{' '}
            <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
              create a new account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3.5 flex items-center gap-2.5 text-sm text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resetMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3.5 flex items-center gap-2.5 text-sm text-emerald-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{resetMessage}</span>
          </div>
        )}

        {isExpired && !error && !resetMessage && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 flex items-center gap-2.5 text-sm text-amber-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Session expired. Please sign in again.</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={resetMode ? handleForgotPassword : handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-[#0d1322] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {!resetMode && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => setResetMode(true)}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-[#0d1322] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white btn-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{resetMode ? 'Send Reset OTP' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

          {resetMode && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
