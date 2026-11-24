import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, ChevronDown, CheckCircle2, Terminal, Shield, Cpu, Activity, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { Logo } from '../../components/layout/Logo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('customer@finsure.demo');
  const [password, setPassword] = useState('FinSure#Customer2026!');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [otpIdentifier, setOtpIdentifier] = useState('+919876543210');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  const redirectAfterLogin = (role: string) => {
    const fromPath = (location.state as { from?: { pathname: string } })?.from?.pathname;
    if (fromPath) {
      navigate(fromPath, { replace: true });
    } else if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (role === 'fraud_analyst' || role === 'compliance_officer') {
      navigate('/console', { replace: true });
    } else {
      navigate('/customer', { replace: true });
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const user = await login(identifier, password);
      redirectAfterLogin(user.role);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpIdentifier.trim()) {
      setErrorMessage('Please enter a valid phone number or email address.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setOtpSuccessMessage('');

    try {
      const isEmail = otpIdentifier.includes('@');
      const res = await authApi.requestOtp({
        identifier: otpIdentifier.trim(),
        channel: isEmail ? 'email' : 'phone',
      });
      setOtpSuccessMessage(res.message || 'Verification code dispatched successfully.');
      setTimeout(() => {
        navigate('/verify-otp', { state: { identifier: otpIdentifier.trim(), mode: 'login' } });
      }, 700);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to dispatch verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoAccount = (role: 'customer' | 'analyst' | 'admin') => {
    if (role === 'customer') {
      setIdentifier('customer@finsure.demo');
      setPassword('FinSure#Customer2026!');
    } else if (role === 'analyst') {
      setIdentifier('analyst@finsure.internal');
      setPassword('FinSure#Sec2026!');
    } else {
      setIdentifier('admin@finsure.internal');
      setPassword('FinSure#Root2026!');
    }
    setLoginMethod('password');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#05080D] text-[#F4F7FA] flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden font-sans">
      {/* Subtle Background Network Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-dot-dense opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-[#19D3FF]/8 via-[#8B5CF6]/5 to-[#4F8CFF]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Header Link */}
      <div className="absolute top-8 left-8 sm:left-12 z-20">
        <Link to="/" className="flex items-center space-x-2 group">
          <Logo size="sm" showSubtitle={false} />
        </Link>
      </div>

      {/* Split 2-Column Auth Layout */}
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Atmospheric Intelligence Visualization (lg:col-span-5) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 rounded-2xl bg-[#080F17] border border-[rgba(25,211,255,0.2)] shadow-[0_24px_80px_rgba(0,0,0,0.7)] h-full space-y-8 text-left relative overflow-hidden">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-widest bg-[#19D3FF]/10 text-[#19D3FF] border border-[#19D3FF]/20">
              <Shield className="w-3 h-3" />
              <span>Identity Perimeter</span>
            </span>

            <h2 className="text-2xl font-display font-bold tracking-tight text-[#F4F7FA] leading-snug">
              Protected access to FinSure fraud intelligence.
            </h2>

            <p className="text-xs text-[#8B9AAA] leading-relaxed">
              Institutional session governance, role-based access controls, and cryptographic audit records for every authentication event.
            </p>
          </div>

          {/* Visual Signal Highlights */}
          <div className="space-y-4 pt-6 border-t border-white/5 text-xs text-[#8B9AAA]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0E1721] text-[#19D3FF] border border-white/5">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-[13px] text-[#F4F7FA]/90">Argon2id password hashing + continuous token rotation</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0E1721] text-[#4F8CFF] border border-white/5">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[13px] text-[#F4F7FA]/90">Sub-100ms real-time session telemetry</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0E1721] text-[#8B5CF6] border border-white/5">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[13px] text-[#F4F7FA]/90">Zero-trust analyst &amp; customer role isolation</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[#8B9AAA]">
            <span>SYSTEM ENCLAVE</span>
            <span className="text-[#38D6A3] font-bold">MUTUAL TLS ACTIVE</span>
          </div>
        </div>

        {/* Right Column: Minimal Secure Authentication Panel (lg:col-span-7) */}
        <div className="lg:col-span-7 w-full p-8 sm:p-10 rounded-2xl bg-[#080F17] border border-[rgba(25,211,255,0.2)] shadow-[0_24px_80px_rgba(0,0,0,0.85)] text-left">
          {/* Header Typography */}
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-display font-extrabold tracking-tight text-[#F4F7FA]">
              Sign In to FinSure
            </h1>
            <p className="text-xs text-[#8B9AAA] font-mono">
              Financial intelligence, without the blind spots
            </p>
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-[#FF4D5F]/15 border border-[#FF4D5F]/30 text-[#FF4D5F] text-xs font-mono">
              {errorMessage}
            </div>
          )}

          {otpSuccessMessage && (
            <div className="mb-5 p-3 rounded-lg bg-[#38D6A3]/15 border border-[#38D6A3]/30 text-[#38D6A3] text-xs font-mono flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{otpSuccessMessage}</span>
            </div>
          )}

          {/* Method Toggle: Password vs OTP */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#0E1721] rounded-xl border border-white/10 mb-6 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('password');
                setErrorMessage('');
              }}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${
                loginMethod === 'password'
                  ? 'bg-[#19D3FF] text-[#05080D] font-bold shadow-[0_0_12px_rgba(25,211,255,0.3)]'
                  : 'text-[#8B9AAA] hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('otp');
                setErrorMessage('');
              }}
              className={`py-2 rounded-lg text-center transition-colors cursor-pointer ${
                loginMethod === 'otp'
                  ? 'bg-[#19D3FF] text-[#05080D] font-bold shadow-[0_0_12px_rgba(25,211,255,0.3)]'
                  : 'text-[#8B9AAA] hover:text-white'
              }`}
            >
              OTP Code
            </button>
          </div>

          {/* Form */}
          {loginMethod === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-[#8B9AAA] block uppercase mb-1.5 text-[10px]">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8B9AAA] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-white placeholder:text-[#576574] focus:outline-none focus:border-[#19D3FF] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[#8B9AAA] uppercase text-[10px]">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-[10px] text-[#19D3FF] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8B9AAA] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-white placeholder:text-[#576574] focus:outline-none focus:border-[#19D3FF] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-[#19D3FF] hover:bg-[#19D3FF]/90 text-[#05080D] font-display font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_20px_rgba(25,211,255,0.35)] mt-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'VERIFYING CREDENTIALS...' : 'SIGN IN'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestOtp} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-[#8B9AAA] block uppercase mb-1.5 text-[10px]">
                  Registered Phone or Email
                </label>
                <input
                  type="text"
                  required
                  value={otpIdentifier}
                  onChange={(e) => setOtpIdentifier(e.target.value)}
                  placeholder="+919876543210 or user@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#05080D] border border-white/10 text-white placeholder:text-[#576574] focus:outline-none focus:border-[#19D3FF] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-[#19D3FF] hover:bg-[#19D3FF]/90 text-[#05080D] font-display font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_20px_rgba(25,211,255,0.35)] mt-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'DISPATCHING TOKEN...' : 'REQUEST OTP CODE'}
              </button>
            </form>
          )}

          {/* Quick Demo Switcher Drawer */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowDemoDrawer(!showDemoDrawer)}
              className="w-full flex items-center justify-between text-[11px] font-mono text-[#8B9AAA] hover:text-white cursor-pointer"
            >
              <span className="flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#19D3FF]" />
                <span>Simulated Demo Accounts</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemoDrawer ? 'rotate-180' : ''}`} />
            </button>

            {showDemoDrawer && (
              <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => setDemoAccount('analyst')}
                  className="p-2 rounded-xl bg-[#0E1721] border border-white/10 hover:border-[#19D3FF] text-left cursor-pointer"
                >
                  <span className="font-bold text-[#19D3FF] block">Analyst</span>
                  <span className="text-[#8B9AAA]">Triage</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDemoAccount('customer')}
                  className="p-2 rounded-xl bg-[#0E1721] border border-white/10 hover:border-[#19D3FF] text-left cursor-pointer"
                >
                  <span className="font-bold text-[#38D6A3] block">Customer</span>
                  <span className="text-[#8B9AAA]">Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDemoAccount('admin')}
                  className="p-2 rounded-xl bg-[#0E1721] border border-white/10 hover:border-[#19D3FF] text-left cursor-pointer"
                >
                  <span className="font-bold text-[#FFB84D] block">Admin</span>
                  <span className="text-[#8B9AAA]">Root</span>
                </button>
              </div>
            )}
          </div>

          {/* Signup Link */}
          <div className="mt-6 text-center text-xs font-mono text-[#8B9AAA]">
            <span>Don't have an account? </span>
            <Link to="/signup" className="text-[#19D3FF] font-bold hover:underline">
              Register for access →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
