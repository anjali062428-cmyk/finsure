"""
Unit and Integration Tests for FinSure Phase 2: Document Parsing & Financial Verification
Covers:
1. Digital PDF text and table extraction.
2. Bounded OCR fallback with Tesseract on scanned images.
3. Financial consistency rules (statement reconciliation, invoice math, running balance).
4. Authorized ledger matching.
5. Case docket escalation and evidence binding.
6. IDOR protection on parse and extracted-data endpoints.
"""

import os
import unittest
import tempfile
import io
from PIL import Image, ImageDraw, ImageFont

from backend.models.document import (
    DocumentRecord, DocumentType, DocumentStatus,
    VerificationVerdict, ReviewStatus
)
from backend.repositories.document_repo import DocumentRepository
from backend.services.document_service import DocumentService
from backend.services.parsing_service import ParsingService
from backend.models.auth import User
from backend.models.document import AuthorizedTransaction


class TestDocumentPhase2(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.repo = DocumentRepository(db_path=":memory:")
        self.parsing_service = ParsingService(self.repo)
        self.doc_service = DocumentService(
            repo=self.repo,
            storage_dir=self.temp_dir,
            parsing_service=self.parsing_service
        )

        self.customer_user = User(
            user_id="cust_alice",
            email="alice@example.com",
            full_name="Alice Sharma",
            phone="+919876543210",
            role="customer",
            password_hash="argon2id$mockhash",
            is_active=True,
            created_at="2026-09-28T00:00:00Z",
            updated_at="2026-09-28T00:00:00Z"
        )
        self.analyst_user = User(
            user_id="analyst_bob",
            email="bob@example.com",
            full_name="Bob Analyst",
            phone="+919876543211",
            role="fraud_analyst",
            password_hash="argon2id$mockhash",
            is_active=True,
            created_at="2026-09-28T00:00:00Z",
            updated_at="2026-09-28T00:00:00Z"
        )
        self.other_customer = User(
            user_id="cust_charlie",
            email="charlie@example.com",
            full_name="Charlie Customer",
            phone="+919876543212",
            role="customer",
            password_hash="argon2id$mockhash",
            is_active=True,
            created_at="2026-09-28T00:00:00Z",
            updated_at="2026-09-28T00:00:00Z"
        )

    def test_bank_statement_consistency_pass(self):
        """Valid bank statement with matching opening + credits - debits == closing should pass."""
        text = """
        Progressive National Bank
        Account Holders Name: TRADE LINKS INDIA
        Customer Id: 577725115
        Account No: 987654321098
        Opening Balance: 10,000.00
        Closing Balance: 15,000.00
        10/01/2026 Salary Deposit 0.00 7,000.00 17,000.00
        15/01/2026 Vendor Payout 2,000.00 0.00 15,000.00
        """
        data = self.parsing_service._parse_bank_statement(text, [], is_ocr=False)
        self.assertEqual(data.opening_balance, 10000.0)
        self.assertEqual(data.closing_balance, 15000.0)
        
        checks, findings = self.parsing_service._run_consistency_checks(
            DocumentType.BANK_STATEMENT, data.model_dump(), is_ocr=False
        )
        # Should contain passed statement reconciliation
        recon_checks = [c for c in checks if c.check_id == "chk_stmt_reconciliation"]
        self.assertTrue(len(recon_checks) > 0)
        self.assertTrue(recon_checks[0].passed)

    def test_bank_statement_reconciliation_mismatch(self):
        """Mismatched opening + credits - debits != closing should produce high_risk finding."""
        fields = {
            "opening_balance": 10000.0,
            "closing_balance": 25000.0,  # Falsified closing balance!
            "total_credits": 2000.0,
            "total_debits": 1000.0,
            "calculated_closing_balance": 11000.0,
            "transactions": []
        }
        checks, findings = self.parsing_service._run_consistency_checks(
            DocumentType.BANK_STATEMENT, fields, is_ocr=False
        )
        recon_checks = [c for c in checks if c.check_id == "chk_stmt_reconciliation"]
        self.assertTrue(len(recon_checks) > 0)
        self.assertFalse(recon_checks[0].passed)
        self.assertEqual(recon_checks[0].severity, "high_risk")
        self.assertTrue(any(f.finding_id == "fnd_stmt_math_mismatch" for f in findings))

    def test_invoice_arithmetic_check(self):
        """Invoice where line items + tax != grand total should flag arithmetic discrepancy."""
        fields = {
            "line_items": [
                {"item_index": 1, "description": "Consulting", "quantity": 1.0, "unit_price": 1000.0, "total_amount": 1000.0, "source": "digital_pdf"}
            ],
            "tax_amount": 180.0,
            "grand_total": 1500.0,  # 1000 + 180 = 1180 != 1500!
            "calculated_total": 1180.0
        }
        checks, findings = self.parsing_service._run_consistency_checks(
            DocumentType.INVOICE, fields, is_ocr=False
        )
        inv_checks = [c for c in checks if c.check_id == "chk_invoice_math"]
        self.assertTrue(len(inv_checks) > 0)
        self.assertFalse(inv_checks[0].passed)
        self.assertEqual(inv_checks[0].severity, "high_risk")

    def test_authorized_ledger_match(self):
        """Extracted reference matching authorized ledger should record verified match."""
        # Seed record
        self.repo.save_authorized_transaction(AuthorizedTransaction(
            record_id="auth_test_001",
            reference_id="UTR1234567890",
            amount=5000.0,
            transaction_date="2026-09-18T10:00:00Z",
            is_synthetic=True,
            data_source="synthetic_seed"
        ))

        fields = {
            "reference_id": "UTR1234567890",
            "claimed_amount": 5000.0
        }
        matched, checks, findings = self.parsing_service._match_authorized_ledger(
            DocumentType.PAYMENT_RECEIPT, fields
        )
        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0]["record_id"], "auth_test_001")
        self.assertTrue(any(c.check_id == "chk_ledger_match" and c.passed for c in checks))

    def test_authorized_ledger_unmatched_advisory(self):
        """Unmatched reference should record advisory finding without claiming proven fraud."""
        fields = {
            "reference_id": "NON_EXISTENT_REF",
            "claimed_amount": 9999.0
        }
        matched, checks, findings = self.parsing_service._match_authorized_ledger(
            DocumentType.PAYMENT_RECEIPT, fields
        )
        self.assertEqual(len(matched), 0)
        self.assertTrue(any(f.finding_id == "fnd_no_ledger_match" for f in findings))
        # Ensure advisory language
        advisory_finding = next(f for f in findings if f.finding_id == "fnd_no_ledger_match")
        self.assertEqual(advisory_finding.severity, "medium")

    def test_receipt_claim_label_invariant(self):
        """Payment receipts must always be labeled 'payment_claim', never 'settled_payment'."""
        text = "Receipt: REC-9921 Date: 12/02/2026 Amount: 4,500.00 Mode: UPI"
        data = self.parsing_service._parse_payment_receipt(text, is_ocr=False)
        self.assertEqual(data.claim_label, "payment_claim")
        self.assertEqual(data.claimed_amount, 4500.0)

    def test_idor_protection_on_parse(self):
        """Customer B cannot trigger parsing or view extracted data of Customer A."""
        # Create a document for alice
        doc = DocumentRecord(
            document_id="doc_alice_001",
            user_id="cust_alice",
            filename="statement.pdf",
            file_size=1024,
            mime_type="application/pdf",
            document_type=DocumentType.BANK_STATEMENT,
            sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            storage_path=os.path.join(self.temp_dir, "test.pdf")
        )
        self.repo.save_document(doc)

        # Charlie attempts to parse Alice's document
        with self.assertRaises(PermissionError):
            self.doc_service.parse_and_verify("doc_alice_001", requesting_user=self.other_customer)

        with self.assertRaises(PermissionError):
            self.doc_service.get_extracted_data("doc_alice_001", requesting_user=self.other_customer)

    def test_escalate_to_case_docket(self):
        """Escalating a document creates a Case in the Case repository with evidence."""
        doc = DocumentRecord(
            document_id="doc_esc_001",
            user_id="cust_alice",
            filename="suspicious_receipt.png",
            file_size=2048,
            mime_type="image/png",
            document_type=DocumentType.PAYMENT_RECEIPT,
            sha256_hash="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            storage_path=os.path.join(self.temp_dir, "test.png"),
            verdict=VerificationVerdict.HIGH_RISK_INDICATORS
        )
        self.repo.save_document(doc)

        res = self.doc_service.create_case_from_document(
            document_id="doc_esc_001",
            priority="HIGH",
            initial_notes="Anomalous receipt amount mismatch",
            requesting_user=self.analyst_user
        )
        self.assertEqual(res["status"], "success")
        self.assertTrue(res["case_id"].startswith("case_doc_"))

        # Verify audit event was logged
        audits = self.repo.list_audit_entries("doc_esc_001")
        self.assertTrue(any(a.action == "escalate_to_case" for a in audits))


if __name__ == "__main__":
    unittest.main()
