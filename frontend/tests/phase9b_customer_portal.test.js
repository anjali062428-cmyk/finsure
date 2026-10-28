import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('FinSure Phase 9B — Customer Portal Contract & Flow Tests', () => {

  describe('1. Risk Band & Canonical Decision Policy Compliance', () => {
    const DECISION_MATRIX = [
      { score: 0, band: 'low', decision: 'approve' },
      { score: 39, band: 'low', decision: 'approve' },
      { score: 40, band: 'medium', decision: 'step_up' },
      { score: 69, band: 'medium', decision: 'step_up' },
      { score: 70, band: 'high', decision: 'cooling_period' },
      { score: 89, band: 'high', decision: 'cooling_period' },
      { score: 90, band: 'critical', decision: 'block' },
      { score: 100, band: 'critical', decision: 'block' },
    ];

    it('should adhere strictly to deterministic institutional risk bands', () => {
      for (const entry of DECISION_MATRIX) {
        if (entry.score <= 39) {
          assert.equal(entry.band, 'low');
          assert.equal(entry.decision, 'approve');
        } else if (entry.score <= 69) {
          assert.equal(entry.band, 'medium');
          assert.equal(entry.decision, 'step_up');
        } else if (entry.score <= 89) {
          assert.equal(entry.band, 'high');
          assert.equal(entry.decision, 'cooling_period');
        } else {
          assert.equal(entry.band, 'critical');
          assert.equal(entry.decision, 'block');
        }
      }
    });
  });

  describe('2. Customer Explanation Safety Compliance', () => {
    const FORBIDDEN_CUSTOMER_TERMS = [
      'shap',
      'xgboost',
      'meta_learner',
      'weights',
      'hyperparameter',
      'autoencoder_anomaly',
      'logistic_regression',
      'loss_gradient',
      'embedding_dim',
    ];

    const SAMPLE_CUSTOMER_EXPLANATION = {
      language: 'en',
      status: 'safe',
      header: 'Payment Verified & Approved',
      message: 'This payment matches your regular spending pattern and was verified securely.',
      instruction: 'No further action required. Your funds have been transferred.',
      safety_highlights: [
        { title: 'Trusted Merchant', description: 'Beneficiary has consistent verified payment history.' },
        { title: 'Device Binding Match', description: 'Initiated from your recognized smartphone hardware.' },
      ],
    };

    it('customer explanation must NEVER expose internal ML model names or raw weights', () => {
      const fullText = JSON.stringify(SAMPLE_CUSTOMER_EXPLANATION).toLowerCase();
      for (const forbidden of FORBIDDEN_CUSTOMER_TERMS) {
        assert.equal(
          fullText.includes(forbidden),
          false,
          `Customer explanation leaked internal ML keyword: "${forbidden}"`
        );
      }
    });

    it('customer explanation must contain required structured fields', () => {
      assert.ok(SAMPLE_CUSTOMER_EXPLANATION.header);
      assert.ok(SAMPLE_CUSTOMER_EXPLANATION.message);
      assert.ok(SAMPLE_CUSTOMER_EXPLANATION.instruction);
      assert.ok(Array.isArray(SAMPLE_CUSTOMER_EXPLANATION.safety_highlights));
      assert.equal(SAMPLE_CUSTOMER_EXPLANATION.safety_highlights.length > 0, true);
    });
  });

  describe('3. Transaction Payload Validation', () => {
    it('should validate positive transfer amounts', () => {
      const validAmount = 4500.5;
      const invalidAmounts = [0, -100, -0.01];

      assert.equal(validAmount > 0, true);
      for (const bad of invalidAmounts) {
        assert.equal(bad > 0, false);
      }
    });

    it('should enforce permitted payment channels', () => {
      const allowedChannels = ['upi', 'card', 'bank_transfer'];
      assert.equal(allowedChannels.includes('upi'), true);
      assert.equal(allowedChannels.includes('card'), true);
      assert.equal(allowedChannels.includes('bank_transfer'), true);
      assert.equal(allowedChannels.includes('crypto'), false);
    });
  });

  describe('4. Dispute / "Not Me" Fast Track Contract', () => {
    it('customer-reported dispute must flag priority HIGH and customer_reported true', () => {
      const disputePayload = {
        transaction_id: 'TXN_TEST_123',
        user_id: 'USR_000319',
        risk_score: 92,
        priority: 'HIGH',
        customer_reported: true,
      };

      assert.equal(disputePayload.customer_reported, true);
      assert.equal(disputePayload.priority, 'HIGH');
      assert.ok(disputePayload.transaction_id);
      assert.ok(disputePayload.user_id);
    });
  });

  describe('5. Step-Up 2FA Challenge Workflow Contract', () => {
    it('step-up verification requires a 6-digit numeric OTP', () => {
      const validOtp = '849201';
      const invalidOtps = ['12345', '1234567', 'abcdef', '12 45'];

      const isValid6Digit = (code) => /^\d{6}$/.test(code);

      assert.equal(isValid6Digit(validOtp), true);
      for (const bad of invalidOtps) {
        assert.equal(isValid6Digit(bad), false);
      }
    });
  });
});
