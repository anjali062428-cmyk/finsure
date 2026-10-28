import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, ShieldAlert, Lock, Activity, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/layout/Logo';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<{ userId: string; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !phone.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const derivedName = fullName.trim() || email.split('@')[0];
      const res = await signup({
        full_name: derivedName,
        email: email.trim(),
        phone: phone.trim(),
        password,
        role: 'customer',
      });

      setSuccessData({
        userId: res.user_id,
        message: res.message || 'Account initialized successfully.',
      });
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080D] text-[#F4F7FA] flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-dot-dense opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-[#19D3C5]/8 to-[#6C9CFF]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Logo */}
      <div className="absolute top-8 left-8 sm:left-12 z-20">
        <Link to="/" className="flex items-center space-x-2 group">
          <Logo size="sm" showSubtitle={false} />
        </Link>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Intelligence Security Highlight */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.15)] shadow-[0_24px_80px_rgba(0,0,0,0.7)] h-full space-y-8 text-left">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-widest bg-[#19D3C5]/10 text-[#19D3C5] border border-[#19D3C5]/20">
              Customer Onboarding
            </span>
            <h2 className="text-2xl font-display font-bold tracking-tight text-[#F4F7FA] leading-snug">
              Institutional intelligence for everyday payments.
            </h2>
            <p className="text-xs text-[#8B9AAA] leading-relaxed">
              Open a verified FinSure customer profile with continuous behavioral monitoring, multi-signal anomaly alerts, and instant dispute resolution.
            </p>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/5 text-xs text-[#8B9AAA]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0E1721] text-[#19D3C5] border border-white/5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[13px] text-[#F4F7FA]/90">Automated scam & coercion cooling periods</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0E1721] text-[#6C9CFF] border border-white/5">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[13px] text-[#F4F7FA]/90">Multi-signal behavioral risk score per transfer</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0E1721] text-[#19D3C5] border border-white/5">
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-[13px] text-[#F4F7FA]/90">Plain-English explanations — zero black boxes</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8B9AAA]">
              <span>STATUS: LIVE SHIELD</span>
              <span className="text-[#38D6A3]">MONITORING ENGAGED</span>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Card */}
        <div className="lg:col-span-7 w-full p-8 sm:p-10 rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] shadow-[0_24px_80px_rgba(0,0,0,0.85)] text-left">
          <div className="mb-6 space-y-1">
            <h2 className="text-2xl font-display font-bold tracking-tight text-[#F4F7FA]">
              Create FinSure Account
            </h2>
            <p className="text-xs text-[#8B9AAA]">
              Real-time payment protection and risk intelligence
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 mb-5 rounded-lg bg-[#FF4D5F]/10 border border-[#FF4D5F]/30 text-xs text-[#FF4D5F] font-medium flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successData ? (
            <div className="space-y-6 text-center py-4">
              <div className="p-6 rounded-xl bg-[#38D6A3]/10 border border-[#38D6A3]/30 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#38D6A3] mx-auto" />
                <h4 className="text-lg font-display font-bold text-[#F4F7FA]">Account Initialized</h4>
                <p className="text-xs text-[#8B9AAA] leading-relaxed">{successData.message}</p>
                <div className="pt-2">
                  <span className="font-mono text-xs text-[#19D3C5] font-bold bg-[#05080D] px-3.5 py-1.5 rounded-lg border border-[rgba(25,211,197,0.3)]">
                    ACCOUNT ID: {successData.userId}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#8B9AAA]">
                Complete security verification with your one-time code to activate protection.
              </p>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 bg-[#19D3C5] hover:bg-[#19D3C5]/90 text-[#05080D] font-display font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_25px_rgba(25,211,197,0.3)] transition-all cursor-pointer"
                onClick={() =>
                  navigate('/verify-otp', {
                    state: { identifier: email.trim(), mode: 'registration' },
                  })
                }
              >
                <span>Proceed to Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-[#8B9AAA] uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-sm text-[#F4F7FA] placeholder:text-[#8B9AAA]/40 focus:outline-none focus:border-[#19D3C5] focus:ring-1 focus:ring-[#19D3C5] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-[#8B9AAA] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="user@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-sm text-[#F4F7FA] placeholder:text-[#8B9AAA]/40 focus:outline-none focus:border-[#19D3C5] focus:ring-1 focus:ring-[#19D3C5] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[#8B9AAA] uppercase tracking-wider mb-1.5">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-sm text-[#F4F7FA] placeholder:text-[#8B9AAA]/40 focus:outline-none focus:border-[#19D3C5] focus:ring-1 focus:ring-[#19D3C5] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-[#8B9AAA] uppercase tracking-wider mb-1.5">
                    Master Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-sm text-[#F4F7FA] placeholder:text-[#8B9AAA]/40 focus:outline-none focus:border-[#19D3C5] focus:ring-1 focus:ring-[#19D3C5] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[#8B9AAA] uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-sm text-[#F4F7FA] placeholder:text-[#8B9AAA]/40 focus:outline-none focus:border-[#19D3C5] focus:ring-1 focus:ring-[#19D3C5] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 bg-[#19D3C5] hover:bg-[#19D3C5]/90 text-[#05080D] font-display font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_25px_rgba(25,211,197,0.3)] transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoading ? 'INITIALIZING PROFILE...' : 'CREATE ACCOUNT'}
              </button>
            </form>
          )}

          {/* Link to Sign In */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <span className="text-xs text-[#8B9AAA]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#19D3C5] hover:underline font-semibold ml-1">
                Sign in
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
