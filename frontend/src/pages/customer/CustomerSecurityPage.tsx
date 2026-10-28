import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Mail,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const CustomerSecurityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Step-Up 2FA Test Tool State
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRequestStepUp = async () => {
    setIsRequesting(true);
    setTestResult(null);
    setOtp('');
    try {
      const res = await authApi.stepUpRequest({
        channel: 'phone',
      });
      setChallengeId(res.challenge_id);
      setTestResult({
        success: true,
        message: res.message || '6-digit step-up challenge code dispatched to your registered phone.',
      });
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: (err as Error).message || 'Failed to request challenge code.',
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyStepUp = async () => {
    if (!challengeId || otp.length < 6) return;
    setIsVerifying(true);
    try {
      const res = await authApi.stepUpVerify({
        challenge_id: challengeId,
        otp,
      });
      setTestResult({
        success: res.success,
        message: res.success
          ? 'Step-Up 2FA Verified! Hardware token generated.'
          : res.message || 'Verification failed.',
      });
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: (err as Error).message || 'Invalid or expired challenge code.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security &amp; Device Verification"
        description="Review multi-factor authentication, verified identity channels, and cryptographic device bindings."
        breadcrumbs={[
          { label: 'Dashboard', href: '/customer' },
          { label: 'Security' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identity & Contact Verification Status */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center space-x-3 pb-3 border-b border-border">
            <div className="p-2 rounded bg-accent/10 text-accent">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text">Account Identity</h3>
              <p className="text-xs text-text-muted">Verified Customer Profile</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted border border-border/80">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-text-muted" />
                <div>
                  <span className="font-semibold text-text block">{user?.email || 'customer@finsure.demo'}</span>
                  <span className="text-[11px] text-text-muted">Primary Notification Rail</span>
                </div>
              </div>
              {user?.email_verified ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-risk-low">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate('/verify-otp', {
                      state: { identifier: user?.email, mode: 'email' },
                    })
                  }
                >
                  Verify Now
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted border border-border/80">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-text-muted" />
                <div>
                  <span className="font-semibold text-text block">{user?.phone || '+919876543210'}</span>
                  <span className="text-[11px] text-text-muted">Step-Up 2FA Mobile Number</span>
                </div>
              </div>
              {user?.phone_verified ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-risk-low">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate('/verify-otp', {
                      state: { identifier: user?.phone, mode: 'phone' },
                    })
                  }
                >
                  Verify Now
                </Button>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-mono text-text-muted">
            <span>Account Status: <strong className="text-risk-low uppercase">{user?.account_status || 'ACTIVE'}</strong></span>
            <span>Role: <strong className="text-accent uppercase">{user?.role || 'CUSTOMER'}</strong></span>
          </div>
        </Card>

        {/* Device Binding & Hardware Fingerprint */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-border">
            <div className="p-2 rounded bg-accent/10 text-accent">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text">Hardware Device Binding</h3>
              <p className="text-xs text-text-muted">Cryptographic SIM / Hardware Association</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-muted border border-border/80 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-text">Primary Web Terminal</span>
              <span className="text-[10px] font-mono text-risk-low bg-risk-low/10 px-2 py-0.5 rounded border border-risk-low/20">
                ACTIVE BINDING
              </span>
            </div>
            <p className="text-text-muted font-mono text-[11px]">
              Binding Fingerprint: DEV_{(user?.user_id || 'USR_000319').substring(0, 8)}_SECURE
            </p>
            <p className="text-text-muted text-[11px]">
              Protected against emulator injection, virtual location spoofing, and remote screen casting tools.
            </p>
          </div>

          <div className="pt-2 text-xs text-text-muted">
            <p className="leading-relaxed">
              If you detect suspicious behavior or change devices, our zero-trust system will prompt for additional 2FA challenge verification before allowing high-value transfers.
            </p>
          </div>
        </Card>

        {/* Step-Up Challenge Verification Test Suite */}
        <div className="md:col-span-2">
          <Card className="p-6 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-border">
              <div className="p-2 rounded bg-accent/10 text-accent">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text">
                  Step-Up 2FA Challenge Test Harness
                </h3>
                <p className="text-xs text-text-muted">
                  Verify your account's live OTP delivery rail and step-up token issuance
                </p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              When the FinSure Decision Engine classifies a transfer as medium risk (Score 40–69), it issues an automated step-up challenge. You can test your delivery rail here.
            </p>

            {testResult && (
              <div
                className={`p-3 rounded-md text-xs font-medium flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-risk-low/10 border border-risk-low/20 text-risk-low'
                    : 'bg-risk-critical/10 border border-risk-critical/20 text-risk-critical'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {!challengeId ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestStepUp}
                isLoading={isRequesting}
              >
                <Smartphone className="w-4 h-4 mr-1.5" />
                <span>Test Step-Up Challenge Delivery</span>
              </Button>
            ) : (
              <div className="space-y-3 max-w-sm">
                <Input
                  label="Enter 6-Digit Challenge Code"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono text-center tracking-widest"
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleVerifyStepUp}
                    isLoading={isVerifying}
                    disabled={otp.length < 6}
                  >
                    Verify Challenge
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setChallengeId(null);
                      setOtp('');
                      setTestResult(null);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
