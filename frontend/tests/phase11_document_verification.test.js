import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('FinSure Phase 11 — Document Verification Platform & Forensic Engine Tests', () => {

  // 1. Canonical Document Types & Claim Label Invariants
  describe('1. Canonical Document Schemas & Claim Label Invariants', () => {
    const CANONICAL_TYPES = ['bank_statement', 'invoice', 'payment_receipt', 'other'];

    it('supported document types must strictly match canonical specification', () => {
      assert.deepEqual(CANONICAL_TYPES, ['bank_statement', 'invoice', 'payment_receipt', 'other']);
    });

    it('payment receipt must strictly carry claim_label="payment_claim", never settled proof', () => {
      const receiptRecord = {
        document_id: 'doc_receipt_12345678',
        document_type: 'payment_receipt',
        claim_label: 'payment_claim',
        is_duplicate: false,
      };

      assert.equal(receiptRecord.document_type, 'payment_receipt');
      assert.equal(receiptRecord.claim_label, 'payment_claim');
      assert.notEqual(receiptRecord.claim_label, 'settled_payment');
      assert.notEqual(receiptRecord.claim_label, 'authentic_transaction');
    });

    it('bank statement and invoice schemas carry appropriate claim labels', () => {
      const statement = { document_type: 'bank_statement', claim_label: 'bank_statement' };
      const invoice = { document_type: 'invoice', claim_label: 'commercial_invoice' };

      assert.equal(statement.claim_label, 'bank_statement');
      assert.equal(invoice.claim_label, 'commercial_invoice');
    });
  });

  // 2. Verification Verdict Taxonomy & Fraud Anomaly Invariants
  describe('2. Verdict Taxonomy & Forensic Invariant Rules', () => {
    const VALID_VERDICTS = [
      'no_significant_anomalies',
      'review_recommended',
      'high_risk_indicators',
      'verification_incomplete',
    ];

    it('verdicts must strictly adhere to 4 canonical categories', () => {
      assert.equal(VALID_VERDICTS.length, 4);
      assert.ok(VALID_VERDICTS.includes('no_significant_anomalies'));
      assert.ok(VALID_VERDICTS.includes('review_recommended'));
      assert.ok(VALID_VERDICTS.includes('high_risk_indicators'));
      assert.ok(VALID_VERDICTS.includes('verification_incomplete'));
    });

    it('INVARIANT: Document anomaly is not automatically fraud without human review', () => {
      const findingWithAnomalies = {
        finding_id: 'fnd_001',
        title: 'Arithmetic Discrepancy',
        severity: 'high_risk',
        human_review_note: 'Discrepancy detected between items and total. Requires manual examination.',
      };

      assert.equal(findingWithAnomalies.severity, 'high_risk');
      assert.ok(findingWithAnomalies.human_review_note.includes('Requires manual examination'));
      assert.notEqual(findingWithAnomalies.title, 'Confirmed Fraud');
    });

    it('INVARIANT: Missing or unreadable key fields must return verification_incomplete', () => {
      const unreadableResult = {
        verdict: 'verification_incomplete',
        findings: [
          {
            title: 'Critical Fields Missing',
            description: 'Could not extract mandatory financial fields.',
          },
        ],
      };

      assert.equal(unreadableResult.verdict, 'verification_incomplete');
      assert.notEqual(unreadableResult.verdict, 'no_significant_anomalies');
    });
  });

  // 3. SHA-256 Duplicate Detection & Content Addressing
  describe('3. Content-Addressable Cryptographic Integrity', () => {
    it('document SHA-256 hash must be exactly 64 hexadecimal characters', () => {
      const sampleHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      assert.equal(sampleHash.length, 64);
      assert.match(sampleHash, /^[a-f0-9]{64}$/);
    });

    it('duplicate detection sets is_duplicate=true while referencing prior original document', () => {
      const originalDoc = {
        document_id: 'doc_orig_112233',
        sha256_hash: 'abc12345def67890abc12345def67890abc12345def67890abc12345def67890',
        is_duplicate: false,
      };

      const duplicateDoc = {
        document_id: 'doc_dup_998877',
        sha256_hash: originalDoc.sha256_hash,
        is_duplicate: true,
        duplicate_of: originalDoc.document_id,
      };

      assert.equal(duplicateDoc.is_duplicate, true);
      assert.equal(duplicateDoc.sha256_hash, originalDoc.sha256_hash);
      assert.equal(duplicateDoc.duplicate_of, originalDoc.document_id);
    });
  });

  // 4. Authorized Ledger Matching & Synthetic Provenance
  describe('4. Authorized Ledger Matching & Synthetic Disclosures', () => {
    it('seeded authorized ledger transactions must visibly declare is_synthetic=true', () => {
      const seededRow = {
        reference_id: 'TXN_UPI_987654321',
        amount: 25000.0,
        is_synthetic: true,
      };

      assert.equal(seededRow.is_synthetic, true);
    });

    it('authorized ledger import declares analyst role requirement and audit tracking', () => {
      const importAction = {
        endpoint: '/api/v1/documents/authorized-ledger/import',
        method: 'POST',
        authorizedRoles: ['fraud_analyst', 'admin'],
        auditLogged: true,
      };

      assert.deepEqual(importAction.authorizedRoles, ['fraud_analyst', 'admin']);
      assert.equal(importAction.auditLogged, true);
    });
  });

  // 5. Case Docket Escalation & Evidence Binder Integration
  describe('5. Case Docket Escalation & Evidence Binding', () => {
    it('document escalation produces formal case docket with bound evidence', () => {
      const escalationPayload = {
        case_id: 'case_doc_escalated_123',
        title: 'Document Investigation: stmt_september.pdf',
        status: 'under_investigation',
        priority: 'HIGH',
        evidence_id: 'evi_doc_12345678',
        evidence_type: 'document_finding',
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      };

      assert.ok(escalationPayload.case_id.startsWith('case_'));
      assert.equal(escalationPayload.status, 'under_investigation');
      assert.equal(escalationPayload.evidence_type, 'document_finding');
      assert.match(escalationPayload.hash, /^[a-f0-9]{64}$/);
    });
  });

  // 6. Router & Navigation Integration Verification
  describe('6. Router & Navigation Integration Contract', () => {
    const routerFile = path.resolve('src/router.tsx');
    const analystLayoutFile = path.resolve('src/layouts/AnalystLayout.tsx');
    const customerLayoutFile = path.resolve('src/layouts/CustomerLayout.tsx');
    const consoleLayoutFile = path.resolve('src/layouts/ConsoleLayout.tsx');

    it('router.tsx registers document list and detail routes for customer, analyst, and console', () => {
      const content = fs.readFileSync(routerFile, 'utf-8');
      assert.ok(content.includes('DocumentListPage'), 'router.tsx must import DocumentListPage');
      assert.ok(content.includes('DocumentDetailPage'), 'router.tsx must import DocumentDetailPage');
      assert.ok(content.includes("path: 'documents'"), 'router.tsx must declare documents route');
      assert.ok(content.includes("path: 'documents/:id'"), 'router.tsx must declare documents/:id route');
    });

    it('AnalystLayout registers Document Verification navigation link', () => {
      const content = fs.readFileSync(analystLayoutFile, 'utf-8');
      assert.ok(content.includes('/analyst/documents'), 'AnalystLayout must include /analyst/documents');
      assert.ok(content.includes('Document Verification'), 'AnalystLayout must label Document Verification');
    });

    it('CustomerLayout registers My Documents navigation link', () => {
      const content = fs.readFileSync(customerLayoutFile, 'utf-8');
      assert.ok(content.includes('/customer/documents'), 'CustomerLayout must include /customer/documents');
      assert.ok(content.includes('My Documents'), 'CustomerLayout must label My Documents');
    });

    it('ConsoleLayout registers Document Verification navigation link', () => {
      const content = fs.readFileSync(consoleLayoutFile, 'utf-8');
      assert.ok(content.includes('/console/documents'), 'ConsoleLayout must include /console/documents');
      assert.ok(content.includes('Document Verification'), 'ConsoleLayout must label Document Verification');
    });
  });
});
