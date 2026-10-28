import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowLeft, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { authApi } from '../../api/auth';
import { Logo } from '../../components/layout/Logo';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const isEmail = identifier.includes('@');
      await authApi.passwordResetRequest({
        identifier: identifier.trim(),
        channel: isEmail ? 'email' : 'phone',
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to dispatch reset request.');
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
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-bold text-[#F4F7FA]">Reset Password</h2>
            <p className="text-xs text-[#8B9AAA] mt-2">
              Request an authenticated recovery token for your FinSure profile
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 mb-5 rounded-lg bg-[#FF4D5F]/10 border border-[#FF4D5F]/30 text-xs text-[#FF4D5F] font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {submitted ? (
            <div className="p-6 rounded-xl bg-[#38D6A3]/10 border border-[#38D6A3]/30 text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-[#38D6A3] mx-auto" />
              <h4 className="text-sm font-display font-bold text-[#F4F7FA]">Recovery Code Dispatched</h4>
              <p className="text-xs text-[#8B9AAA] leading-relaxed">
                If an account matches <span className="font-mono text-[#19D3C5]">{identifier}</span>, a secure recovery code has been sent.
              </p>
              <div className="pt-2 flex flex-col gap-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 bg-[#19D3C5] hover:bg-[#19D3C5]/90 text-[#05080D] font-display font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_25px_rgba(25,211,197,0.3)] transition-all cursor-pointer"
                  onClick={() =>
                    navigate('/reset-password', {
                      state: { identifier: identifier.trim() },
                    })
                  }
                >
                  <span>Enter Code &amp; Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/login"
                  className="w-full py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-xs font-medium text-[#8B9AAA] hover:text-[#F4F7FA] hover:border-white/20 transition-all text-center"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-[#8B9AAA] uppercase tracking-wider mb-1.5">
                  Registered Email or Phone
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-[#19D3C5] hover:bg-[#19D3C5]/90 text-[#05080D] font-display font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_25px_rgba(25,211,197,0.3)] transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading ? 'DISPATCHING TOKEN...' : 'SEND RECOVERY CODE'}
              </button>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-center">
                <Link
                  to="/login"
                  className="text-xs text-[#8B9AAA] hover:text-[#F4F7FA] inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
