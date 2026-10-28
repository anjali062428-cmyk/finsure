import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { authApi } from '../../api/auth';
import { Logo } from '../../components/layout/Logo';

export const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const passedIdentifier = (location.state as { identifier?: string })?.identifier || '';

  const [identifier, setIdentifier] = useState(passedIdentifier);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !otp.trim() || !newPassword.trim()) {
      setErrorMessage('Identifier, recovery code, and new password are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await authApi.passwordResetConfirm({
        identifier: identifier.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Password reset failed. Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080D] text-[#F4F7FA] flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-dot-dense opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#19D3C5]/8 to-[#6C9CFF]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Logo */}
      <div className="absolute top-8 left-8 sm:left-12 z-20">
        <Link to="/" className="flex items-center space-x-2 group">
          <Logo size="sm" showSubtitle={false} />
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="p-8 sm:p-10 rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-xl bg-[#0E1721] text-[#19D3C5] border border-white/5 mb-4 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-bold text-[#F4F7FA]">Set New Password</h2>
            <p className="text-xs text-[#8B9AAA] mt-2">
              Establish a new master passphrase for your FinSure profile
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 mb-5 rounded-lg bg-[#FF4D5F]/10 border border-[#FF4D5F]/30 text-xs text-[#FF4D5F] font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {success ? (
            <div className="p-6 rounded-xl bg-[#38D6A3]/10 border border-[#38D6A3]/30 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[#38D6A3] mx-auto" />
              <h4 className="text-sm font-display font-bold text-[#F4F7FA]">Password Reset Successfully</h4>
              <p className="text-xs text-[#8B9AAA] leading-relaxed">
                All previous authenticated sessions have been revoked. Redirecting to sign in...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-[#8B9AAA] uppercase tracking-wider mb-1.5">
                  Email or Mobile Phone
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="user@domain.com or +919876543210"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-sm text-[#F4F7FA] placeholder:text-[#8B9AAA]/40 focus:outline-none focus:border-[#19D3C5] focus:ring-1 focus:ring-[#19D3C5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[#8B9AAA] uppercase tracking-wider mb-1.5">
                  6-Digit Recovery Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-sm font-mono tracking-widest text-[#F4F7FA] placeholder:text-[#8B9AAA]/40 focus:outline-none focus:border-[#19D3C5] focus:ring-1 focus:ring-[#19D3C5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[#8B9AAA] uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-sm text-[#F4F7FA] placeholder:text-[#8B9AAA]/40 focus:outline-none focus:border-[#19D3C5] focus:ring-1 focus:ring-[#19D3C5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[#8B9AAA] uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-sm text-[#F4F7FA] placeholder:text-[#8B9AAA]/40 focus:outline-none focus:border-[#19D3C5] focus:ring-1 focus:ring-[#19D3C5] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-[#19D3C5] hover:bg-[#19D3C5]/90 text-[#05080D] font-display font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_25px_rgba(25,211,197,0.3)] transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading ? 'UPDATING CREDENTIALS...' : 'UPDATE PASSWORD'}
              </button>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-center">
                <Link
                  to="/login"
                  className="text-xs text-[#8B9AAA] hover:text-[#F4F7FA] inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel and Return</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
