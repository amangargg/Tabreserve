import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

const VerifyOtp: React.FC = () => {
  const { verifyOtp, resendOtp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const email = searchParams.get('email') || '';
  const isReset = searchParams.get('reset') === 'true';
  
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isReset) {
        await resetPassword({ email, otp, new_password: newPassword });
        setMessage('Password reset successful. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2500);
      } else {
        const user = await verifyOtp({ email, otp });
        setMessage('Account verified successfully! Redirecting...');
        setTimeout(() => {
          if (user.role === 'owner') navigate('/owner-dashboard');
          else if (user.role === 'admin') navigate('/admin');
          else navigate('/restaurants');
        }, 2000);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    try {
      await resendOtp(email);
      setMessage('A new OTP has been dispatched to your email.');
      setResendTimer(60);
    } catch (err: any) {
      setError(err);
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
            {isReset ? 'Verify & Reset' : 'Verify your email'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            We have sent a 6-digit OTP code to <br/>
            <span className="font-semibold text-gray-300">{email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3.5 flex items-center gap-2.5 text-sm text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3.5 flex items-center gap-2.5 text-sm text-emerald-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{message}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="otp" className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">One-Time Password (OTP)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="block w-full pl-10 pr-4 py-3 bg-[#0d1322] border border-gray-800 rounded-xl text-center font-mono text-xl tracking-[10px] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  placeholder="000000"
                />
              </div>
            </div>

            {isReset && (
              <div>
                <label htmlFor="new-password" className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Choose New Password</label>
                <input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-4 py-3 bg-[#0d1322] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Didn't receive a code?</span>
            <button
              type="button"
              disabled={resendTimer > 0}
              onClick={handleResend}
              className="font-semibold text-brand-400 hover:text-brand-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white btn-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Verify Code</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyOtp;
