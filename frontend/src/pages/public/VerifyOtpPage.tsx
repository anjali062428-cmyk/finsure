import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Smartphone, CheckCircle2, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { Logo } from '../../components/layout/Logo';

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithOtp } = useAuth();

  const stateData = (location.state as { identifier?: string; mode?: 'login' | 'email' | 'phone' | 'registration' }) || {};
  const identifier = stateData.identifier || '+919876543210';
  const mode = stateData.mode || 'login';

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    const newOtp = [...otp];

    if (cleanVal.length > 1) {
      const digits = cleanVal.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      const nextFocus = Math.min(digits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    newOtp[index] = cleanVal;
    setOtp(newOtp);

    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    const targetIdx = Math.min(pasted.length, 5);
    inputRefs.current[targetIdx]?.focus();
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (mode === 'email' || mode === 'registration') {
        const res = await authApi.verifyEmail({ email: identifier, otp: otpCode });
        setSuccessMessage(res.message || 'Identity verified successfully! Routing to sign in...');
        setTimeout(() => navigate('/login'), 1200);
      } else if (mode === 'phone') {
        const res = await authApi.verifyPhone({ phone: identifier, otp: otpCode });
        setSuccessMessage(res.message || 'Phone number verified successfully!');
        setTimeout(() => navigate('/customer/security'), 1200);
      } else {
        // mode === 'login'
        const user = await loginWithOtp(identifier, otpCode);
        setSuccessMessage('Authentication verified! Entering secure session...');
        setTimeout(() => {
          if (user.role === 'admin') {
            navigate('/admin', { replace: true });
          } else if (user.role === 'fraud_analyst' || user.role === 'compliance_officer') {
            navigate('/console', { replace: true });
          } else {
            navigate('/customer', { replace: true });
          }
        }, 700);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Invalid or expired OTP code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setErrorMessage('');
    try {
      const isEmail = identifier.includes('@');
      const res = await authApi.requestOtp({
        identifier,
        channel: isEmail ? 'email' : 'phone',
      });
      setSuccessMessage(res.message || 'New OTP code dispatched.');
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to dispatch new OTP.');
    } finally {
      setIsResending(false);
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
        <div className="p-8 sm:p-10 rounded-2xl bg-[#080F17] border border-[rgba(25,211,197,0.2)] shadow-[0_24px_80px_rgba(0,0,0,0.85)] text-center">
          <div className="inline-flex p-3 rounded-xl bg-[#0E1721] text-[#19D3C5] border border-white/5 mb-5 shadow-inner">
            <Smartphone className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-display font-bold text-[#F4F7FA]">
            Two-Factor Verification
          </h2>
          <p className="text-xs text-[#8B9AAA] mt-2 mb-6 leading-relaxed">
            Enter the 6-digit secure token dispatched to <br />
            <span className="font-mono font-semibold text-[#19D3C5]">{identifier}</span>
          </p>

          {errorMessage && (
            <div className="p-3 mb-5 rounded-lg bg-[#FF4D5F]/10 border border-[#FF4D5F]/30 text-xs text-[#FF4D5F] font-medium flex items-center justify-center gap-1.5 text-left">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 mb-5 rounded-lg bg-[#38D6A3]/10 border border-[#38D6A3]/30 text-xs text-[#38D6A3] font-medium flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 6-Digit Auto-Advancing Input Group */}
          <div className="flex justify-center gap-2 sm:gap-2.5 mb-6">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                aria-label={`Digit ${idx + 1}`}
                className="w-11 sm:w-12 h-14 text-center text-xl font-mono font-bold bg-[#05080D] border border-white/10 rounded-xl text-[#F4F7FA] focus:outline-none focus:border-[#19D3C5] focus:ring-1 focus:ring-[#19D3C5] shadow-inner transition-all"
              />
            ))}
          </div>

          <button
            type="button"
            className="w-full bg-[#19D3C5] hover:bg-[#19D3C5]/90 text-[#05080D] font-display font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_25px_rgba(25,211,197,0.3)] transition-all cursor-pointer disabled:opacity-50"
            onClick={handleVerify}
            disabled={isVerifying || otp.join('').length < 6}
          >
            {isVerifying ? 'AUTHENTICATING TOKEN...' : 'VERIFY & PROCEED'}
          </button>

          <div className="mt-6 text-xs text-[#8B9AAA]">
            {timer > 0 ? (
              <span>
                Resend security token in{' '}
                <strong className="font-mono text-[#F4F7FA]">{timer}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-[#19D3C5] hover:underline font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Dispatching...' : 'Resend Verification Code'}</span>
              </button>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex justify-center">
            <Link
              to="/login"
              className="text-xs text-[#8B9AAA] hover:text-[#F4F7FA] inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to password login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
