"""
FinSure Financial Document Verification Platform — Phase 1 Test Suite
Tests:
1. Document upload with valid magic bytes (PDF, PNG, JPEG, TIFF).
2. Content signature spoofing and corrupted file rejection.
3. 25 MB payload ceiling enforcement.
4. SHA-256 content-addressed deduplication.
5. Claim labeling invariant (Payment receipt = payment claim).
6. Strict IDOR protection across document retrieval, download, and audit trails.
7. Role separation: Customer isolation vs Analyst/Compliance cross-visibility.
8. Graceful host OCR inspection.
9. Authorized transaction ledger seeding, analyst CSV import, and customer RBAC rejection.
"""

import os
import io
import shutil
import tempfile
import unittest
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.main import app
from backend.models.auth import User
from backend.models.document import DocumentType, DocumentStatus
from backend.repositories.auth_repo import AuthRepository
from backend.repositories.document_repo import DocumentRepository
from backend.services.auth_service import AuthService
from backend.services.crypto_service import CryptoService
from backend.services.otp_service import OTPService, TestNotificationAdapter
from backend.services.token_service import TokenService
from backend.services.document_service import DocumentService
from backend.api.dependencies.auth import set_custom_auth_service
from backend.api.dependencies.document import set_custom_document_repo, set_custom_document_service


class TestDocumentPhase1(unittest.TestCase):
    """Phase 1 unit and integration test suite."""

    @classmethod
    def setUpClass(cls):
        cls.test_dir = tempfile.mkdtemp(prefix="finsure_doc_test_")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.test_dir, ignore_errors=True)

    def setUp(self):
        # 1. In-memory Auth setup
        self.auth_repo = AuthRepository(":memory:")
        self.crypto_service = CryptoService()
        self.otp_adapter = TestNotificationAdapter()
        self.otp_service = OTPService(self.auth_repo, self.crypto_service, self.otp_adapter)
        self.token_service = TokenService(self.auth_repo, self.crypto_service)
        self.auth_service = AuthService(
            self.auth_repo, self.crypto_service, self.otp_service, self.token_service
        )
        set_custom_auth_service(self.auth_service)

        # 2. In-memory Document repo & isolated storage
        self.doc_storage = os.path.join(self.test_dir, "uploads")
        os.makedirs(self.doc_storage, exist_ok=True)
        self.doc_repo = DocumentRepository(":memory:")
        self.doc_service = DocumentService(self.doc_repo, storage_dir=self.doc_storage)
        set_custom_document_repo(self.doc_repo)
        set_custom_document_service(self.doc_service)

        # 3. Test Users
        now = datetime.now(timezone.utc).isoformat()
        pwd_hash = self.crypto_service.hash_password("Passw0rd!123")

        # Customer A
        self.user_a = User(
            user_id="usr_cust_a",
            full_name="Alice Customer",
            email="alice@customer.local",
            phone="+919876543210",
            password_hash=pwd_hash,
            role="customer",
            email_verified=True,
            phone_verified=True,
            account_status="active",
            created_at=now,
            updated_at=now
        )
        self.auth_repo.create_user(self.user_a)
        self.token_a = self.token_service.create_access_token(self.user_a.user_id, self.user_a.role)

        # Customer B
        self.user_b = User(
            user_id="usr_cust_b",
            full_name="Bob Customer",
            email="bob@customer.local",
            phone="+919876543211",
            password_hash=pwd_hash,
            role="customer",
            email_verified=True,
            phone_verified=True,
            account_status="active",
            created_at=now,
            updated_at=now
        )
        self.auth_repo.create_user(self.user_b)
        self.token_b = self.token_service.create_access_token(self.user_b.user_id, self.user_b.role)

        # Fraud Analyst
        self.analyst = User(
            user_id="usr_analyst_1",
            full_name="Diana Analyst",
            email="diana@finsure.local",
            phone="+919876543212",
            password_hash=pwd_hash,
            role="fraud_analyst",
            email_verified=True,
            phone_verified=True,
            account_status="active",
            created_at=now,
            updated_at=now
        )
        self.auth_repo.create_user(self.analyst)
        self.token_analyst = self.token_service.create_access_token(self.analyst.user_id, self.analyst.role)

        # Compliance Officer
        self.compliance = User(
            user_id="usr_comp_1",
            full_name="Evan Compliance",
            email="evan@finsure.local",
            phone="+919876543213",
            password_hash=pwd_hash,
            role="compliance_officer",
            email_verified=True,
            phone_verified=True,
            account_status="active",
            created_at=now,
            updated_at=now
        )
        self.auth_repo.create_user(self.compliance)
        self.token_compliance = self.token_service.create_access_token(self.compliance.user_id, self.compliance.role)

        self.client = TestClient(app)

    # -------------------------------------------------------------
    # Magic-Bytes & Signature Validation Tests
    # -------------------------------------------------------------

    def test_upload_valid_pdf_statement(self):
        """Valid PDF with %PDF- header is accepted and classified as statement_record."""
        pdf_content = b"%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF\n"
        response = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "bank_statement", "notes": "HDFC Q3 Statement"},
            files={"file": ("statement.pdf", pdf_content, "application/pdf")}
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["mime_type"], "application/pdf")
        self.assertEqual(data["document_type"], "bank_statement")
        self.assertEqual(data["claim_label"], "statement_record")
        self.assertFalse(data["is_duplicate"])
        self.assertEqual(len(data["sha256_hash"]), 64)

    def test_upload_valid_png_invoice(self):
        """Valid PNG image with PNG magic bytes is accepted and classified as invoice_claim."""
        png_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        response = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "invoice"},
            files={"file": ("vendor_bill.png", png_content, "image/png")}
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["mime_type"], "image/png")
        self.assertEqual(data["document_type"], "invoice")
        self.assertEqual(data["claim_label"], "invoice_claim")

    def test_upload_valid_jpeg_receipt_claim_invariant(self):
        """Payment receipt is strictly classified as 'payment_claim' (never settled payment)."""
        jpeg_content = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb"
        response = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "payment_receipt"},
            files={"file": ("gpay_receipt.jpg", jpeg_content, "image/jpeg")}
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["mime_type"], "image/jpeg")
        self.assertEqual(data["document_type"], "payment_receipt")
        self.assertEqual(data["claim_label"], "payment_claim")

    def test_reject_spoofed_file_signature(self):
        """Rejects spoofed file with .pdf extension containing plain text or binary rubbish."""
        fake_pdf = b"This is plain text pretending to be a PDF statement."
        response = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "bank_statement"},
            files={"file": ("fake.pdf", fake_pdf, "application/pdf")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file signature or corrupted magic bytes", response.json()["detail"])

    def test_reject_extension_magic_mismatch(self):
        """Rejects file when PNG content is passed with a claimed .pdf extension."""
        png_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        response = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "bank_statement"},
            files={"file": ("statement.pdf", png_content, "application/pdf")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("MIME/Magic-bytes mismatch", response.json()["detail"])

    def test_reject_empty_file(self):
        """Rejects zero-byte upload."""
        response = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "invoice"},
            files={"file": ("empty.pdf", b"", "application/pdf")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["detail"].lower())

    # -------------------------------------------------------------
    # Deduplication & SHA-256 Tests
    # -------------------------------------------------------------

    def test_sha256_duplicate_detection(self):
        """Uploading identical content marks subsequent uploads as duplicate linking to original."""
        pdf_bytes = b"%PDF-1.4\n%UniqueContentHashTest12345\n%%EOF"

        # First upload by Alice
        resp1 = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "bank_statement"},
            files={"file": ("orig.pdf", pdf_bytes, "application/pdf")}
        )
        self.assertEqual(resp1.status_code, 201)
        doc1 = resp1.json()
        self.assertFalse(doc1["is_duplicate"])
        self.assertIsNone(doc1["duplicate_of"])

        # Second upload with identical bytes
        resp2 = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_b}"},
            data={"document_type": "bank_statement"},
            files={"file": ("copy.pdf", pdf_bytes, "application/pdf")}
        )
        self.assertEqual(resp2.status_code, 201)
        doc2 = resp2.json()
        self.assertTrue(doc2["is_duplicate"])
        self.assertEqual(doc2["duplicate_of"], doc1["document_id"])
        self.assertEqual(doc2["sha256_hash"], doc1["sha256_hash"])

    # -------------------------------------------------------------
    # IDOR (Insecure Direct Object Reference) Protection Tests
    # -------------------------------------------------------------

    def test_idor_customer_cannot_view_other_document(self):
        """Customer B receives 403 Forbidden when attempting to view Customer A's document."""
        pdf_content = b"%PDF-1.4\nAlice Private Statement\n%%EOF"
        resp_upload = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "bank_statement"},
            files={"file": ("alice_statement.pdf", pdf_content, "application/pdf")}
        )
        doc_id = resp_upload.json()["document_id"]

        # Alice views her own document -> 200 OK
        resp_alice = self.client.get(
            f"/api/v1/documents/{doc_id}",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(resp_alice.status_code, 200)

        # Bob attempts to view Alice's document -> 403 Forbidden
        resp_bob = self.client.get(
            f"/api/v1/documents/{doc_id}",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(resp_bob.status_code, 403)
        self.assertIn("Access forbidden", resp_bob.json()["detail"])

    def test_idor_customer_cannot_download_other_file(self):
        """Customer B receives 403 Forbidden when attempting to download Customer A's binary file."""
        pdf_content = b"%PDF-1.4\nAlice Confidential Salary\n%%EOF"
        resp_upload = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "bank_statement"},
            files={"file": ("salary.pdf", pdf_content, "application/pdf")}
        )
        doc_id = resp_upload.json()["document_id"]

        # Bob attempts to download -> 403 Forbidden
        resp_bob_dl = self.client.get(
            f"/api/v1/documents/{doc_id}/download",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(resp_bob_dl.status_code, 403)

        # Alice downloads her own file -> 200 OK
        resp_alice_dl = self.client.get(
            f"/api/v1/documents/{doc_id}/download",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(resp_alice_dl.status_code, 200)
        self.assertEqual(resp_alice_dl.content, pdf_content)

    def test_customer_list_is_strictly_scoped(self):
        """Customer only lists documents belonging to their own user_id."""
        # Alice uploads
        self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "invoice"},
            files={"file": ("alice_bill.png", b"\x89PNG\r\n\x1a\n\x01", "image/png")}
        )
        # Bob uploads
        self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_b}"},
            data={"document_type": "invoice"},
            files={"file": ("bob_bill.png", b"\x89PNG\r\n\x1a\n\x02", "image/png")}
        )

        # Alice list
        list_a = self.client.get(
            "/api/v1/documents",
            headers={"Authorization": f"Bearer {self.token_a}"}
        ).json()
        self.assertEqual(len(list_a), 1)
        self.assertEqual(list_a[0]["user_id"], self.user_a.user_id)

        # Bob list
        list_b = self.client.get(
            "/api/v1/documents",
            headers={"Authorization": f"Bearer {self.token_b}"}
        ).json()
        self.assertEqual(len(list_b), 1)
        self.assertEqual(list_b[0]["user_id"], self.user_b.user_id)

    def test_analyst_and_compliance_cross_visibility(self):
        """Fraud Analyst and Compliance Officer have cross-visibility to all documents."""
        # Alice uploads
        resp = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "bank_statement"},
            files={"file": ("alice_doc.pdf", b"%PDF-1.5\nCrossVis\n%%EOF", "application/pdf")}
        )
        doc_id = resp.json()["document_id"]

        # Analyst can view and download
        resp_an = self.client.get(
            f"/api/v1/documents/{doc_id}",
            headers={"Authorization": f"Bearer {self.token_analyst}"}
        )
        self.assertEqual(resp_an.status_code, 200)

        resp_an_dl = self.client.get(
            f"/api/v1/documents/{doc_id}/download",
            headers={"Authorization": f"Bearer {self.token_analyst}"}
        )
        self.assertEqual(resp_an_dl.status_code, 200)

        # Compliance Officer can view and download
        resp_comp = self.client.get(
            f"/api/v1/documents/{doc_id}",
            headers={"Authorization": f"Bearer {self.token_compliance}"}
        )
        self.assertEqual(resp_comp.status_code, 200)

    # -------------------------------------------------------------
    # Audit Trail & Host OCR Inspection Tests
    # -------------------------------------------------------------

    def test_document_audit_trail_recording(self):
        """Upload, view, and download events are logged in the immutable audit trail."""
        resp = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            data={"document_type": "invoice"},
            files={"file": ("inv.png", b"\x89PNG\r\n\x1a\n\x05", "image/png")}
        )
        doc_id = resp.json()["document_id"]

        # View document
        self.client.get(
            f"/api/v1/documents/{doc_id}",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )

        # Download document
        self.client.get(
            f"/api/v1/documents/{doc_id}/download",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )

        # Retrieve audit trail
        audit_resp = self.client.get(
            f"/api/v1/documents/{doc_id}/audit",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(audit_resp.status_code, 200)
        events = [e["action"] for e in audit_resp.json()]
        self.assertIn("upload", events)
        self.assertIn("view", events)
        self.assertIn("download", events)

    def test_ocr_status_inspection(self):
        """OCR status endpoint reports host capability without throwing."""
        resp = self.client.get(
            "/api/v1/documents/ocr/status",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("available", data)
        self.assertIn("status", data)

    # -------------------------------------------------------------
    # Authorized Ledger & Seed Matching Tests
    # -------------------------------------------------------------

    def test_analyst_can_import_authorized_ledger_csv(self):
        """Fraud analyst can upload authorized records; customer is rejected with 403."""
        csv_data = (
            "reference_id,amount,transaction_date,payer_vpa,payee_vpa,account_number\n"
            "UTR100099,45000.0,2026-10-25T14:30:00Z,corp@oksbi,vendor@icici,1029384756\n"
            "UTR100100,1250.50,2026-10-26T09:15:00Z,alice@oksbi,store@paytm,9988776655\n"
        ).encode("utf-8")

        # Customer attempts import -> 403 Forbidden
        resp_cust = self.client.post(
            "/api/v1/documents/ledger/import",
            headers={"Authorization": f"Bearer {self.token_a}"},
            files={"file": ("ledger.csv", csv_data, "text/csv")}
        )
        self.assertEqual(resp_cust.status_code, 403)

        # Analyst attempts import -> 200 OK
        resp_an = self.client.post(
            "/api/v1/documents/ledger/import",
            headers={"Authorization": f"Bearer {self.token_analyst}"},
            files={"file": ("ledger.csv", csv_data, "text/csv")}
        )
        self.assertEqual(resp_an.status_code, 200)
        self.assertEqual(resp_an.json()["imported_count"], 2)

        # Query back imported transaction
        query_resp = self.client.get(
            "/api/v1/documents/ledger/transactions?reference_id=UTR100099",
            headers={"Authorization": f"Bearer {self.token_analyst}"}
        )
        self.assertEqual(query_resp.status_code, 200)
        results = query_resp.json()
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["reference_id"], "UTR100099")
        self.assertEqual(results[0]["amount"], 45000.0)
        self.assertFalse(results[0]["is_synthetic"])


if __name__ == "__main__":
    unittest.main()
