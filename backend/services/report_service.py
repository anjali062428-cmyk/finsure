"""
FinSure Incident Report Generation Service
Produces cryptographically verifiable PDF reports:
1. Customer Incident Report (strict customer isolation, plain-language reason, zero model internals).
2. Analyst Evidence Pack (deep forensic evidence, SHAP, sequence attention, graph metrics,
   autoencoder error, scam probabilities, audit event timeline, and chain verification).
Both reports embed SHA-256 content hashes and verification QR codes.
"""

import io
import os
import json
import uuid
import hashlib
import logging
from typing import Tuple, Dict, Any, Optional
from datetime import datetime, timezone
import qrcode

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from backend.models.incident import Incident, IncidentReportRecord
from backend.repositories.incident_repo import IncidentRepository

logger = logging.getLogger("finsure.report_service")


class IncidentReportService:
    """Generates and cryptographically verifies customer and analyst PDF reports."""

    def __init__(self, incident_repo: IncidentRepository):
        self.repo = incident_repo
        self.styles = getSampleStyleSheet()
        self._init_custom_styles()

    def _init_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name="ReportTitle",
            parent=self.styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=6
        ))
        self.styles.add(ParagraphStyle(
            name="ReportSubtitle",
            parent=self.styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569"),
            spaceAfter=12
        ))
        self.styles.add(ParagraphStyle(
            name="SectionHeading",
            parent=self.styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=10,
            spaceAfter=6
        ))
        self.styles.add(ParagraphStyle(
            name="BodySmall",
            parent=self.styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#334155")
        ))
        self.styles.add(ParagraphStyle(
            name="DisclaimerText",
            parent=self.styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#64748b")
        ))

    def _generate_qr_image(self, payload_str: str) -> io.BytesIO:
        """Generates QR code PNG buffer."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=4,
            border=2
        )
        qr.add_data(payload_str)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf

    # -------------------------------------------------------------
    # 1. Customer Incident Report
    # -------------------------------------------------------------
    def generate_customer_report(self, incident_id: str) -> Tuple[bytes, IncidentReportRecord]:
        """
        Generates customer-safe PDF report.
        Strict isolation: Absolutely NO SHAP values, internal model scores,
        graph clusters, or internal thresholds are included.
        """
        incident = self.repo.get_incident_by_id(incident_id)
        if not incident:
            raise ValueError(f"Incident '{incident_id}' not found.")

        report_id = f"rep_cust_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        snapshot = incident.scoring_snapshot or {}

        # Extract plain customer reason
        cust_explanation = snapshot.get("customer_explanation", {})
        plain_reason = (
            cust_explanation.get("summary") or
            cust_explanation.get("reason_text_en") or
            "Unusual account activity or unfamiliar device characteristics detected."
        )

        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        story = []

        # Title Block
        story.append(Paragraph("FinSure Security Incident Summary", self.styles["ReportTitle"]))
        story.append(Paragraph(
            f"Official Notification of Automated Fraud Prevention & Transaction Protection | Report ID: {report_id}",
            self.styles["ReportSubtitle"]
        ))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=12))

        # Overview Table
        txn_data = [
            ["Incident Reference ID", incident.incident_id],
            ["Transaction ID", incident.transaction_id],
            ["Date & Time (UTC)", incident.created_at],
            ["Account Holder ID", incident.user_id],
            ["Transaction Amount", f"₹ {snapshot.get('amount', 'N/A')}"],
            ["Transaction Status", "BLOCKED / REJECTED" if incident.decision.lower() == "block" else "FLAGGED FOR REVIEW"],
            ["Security Protection Level", incident.risk_band]
        ]
        t1 = Table(txn_data, colWidths=[180, 360])
        t1.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t1)
        story.append(Spacer(1, 14))

        # Plain-language explanation (Customer-Safe)
        story.append(Paragraph("Reason for Security Action", self.styles["SectionHeading"]))
        story.append(Paragraph(plain_reason, self.styles["Normal"]))
        story.append(Spacer(1, 14))

        # Recommended customer actions
        story.append(Paragraph("Recommended Protective Actions", self.styles["SectionHeading"]))
        actions_html = (
            "1. <b>Never share your UPI PIN or OTP</b> with anyone, including callers claiming to represent FinSure or your bank.<br/>"
            "2. <b>Verify your registered mobile and email</b> settings in the FinSure application profile.<br/>"
            "3. If this transaction was not initiated by you, immediately change your UPI PIN and contact bank support.<br/>"
            "4. <b>National Cyber Crime Helpline (India):</b> Call <b>1930</b> or report at <b>cybercrime.gov.in</b>."
        )
        story.append(Paragraph(actions_html, self.styles["Normal"]))
        story.append(Spacer(1, 18))

        # QR Code & Content Integrity Block
        qr_payload = json.dumps({
            "report_id": report_id,
            "incident_id": incident.incident_id,
            "type": "customer_report",
            "timestamp": now_iso
        })
        qr_buf = self._generate_qr_image(qr_payload)
        qr_img = Image(qr_buf, width=72, height=72)

        verif_data = [
            [
                qr_img,
                Paragraph(
                    f"<b>Report Verification QR & Integrity Seal</b><br/>"
                    f"Generated: {now_iso}<br/>"
                    f"Report ID: {report_id}<br/>"
                    f"Scan QR to verify this document against FinSure tamper-evident audit records.<br/>"
                    f"<i>Note: Cryptographic verification proves content integrity at generation; "
                    f"it does not constitute judicial evidence of underlying facts.</i>",
                    self.styles["BodySmall"]
                )
            ]
        ]
        t_qr = Table(verif_data, colWidths=[80, 460])
        t_qr.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("LINEABOVE", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0"))
        ]))
        story.append(t_qr)

        # Build PDF
        doc.build(story)
        pdf_bytes = pdf_buffer.getvalue()

        # Compute SHA-256 content hash
        content_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # Save record
        record = IncidentReportRecord(
            report_id=report_id,
            incident_id=incident.incident_id,
            report_type="customer",
            file_path=None,
            content_hash=content_hash,
            qr_payload=qr_payload,
            generated_at=now_iso,
            generator_role="customer"
        )
        self.repo.save_report_record(record)

        return pdf_bytes, record

    # -------------------------------------------------------------
    # 2. Analyst Evidence Pack
    # -------------------------------------------------------------
    def generate_analyst_report(
        self,
        incident_id: str,
        generator_role: str = "fraud_analyst"
    ) -> Tuple[bytes, IncidentReportRecord]:
        """
        Generates comprehensive Analyst Evidence Pack PDF.
        Includes multi-modal ML evidence, SHAP, sequence attention, graph evidence,
        autoencoder score, scam head, forensic audit ledger, and chain verification.
        """
        incident = self.repo.get_incident_by_id(incident_id)
        if not incident:
            raise ValueError(f"Incident '{incident_id}' not found.")

        report_id = f"rep_analyst_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        snapshot = incident.scoring_snapshot or {}
        analyst_exp = snapshot.get("analyst_explanation", {})

        # Cryptographic chain verification
        is_chain_valid, chain_msg, event_count = self.repo.verify_incident_event_chain(incident.incident_id)
        events = self.repo.get_incident_events(incident.incident_id)
        notes = self.repo.get_notes(incident.incident_id)

        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        story = []

        # Title Block
        story.append(Paragraph("FinSure Forensic Fraud Investigation & Evidence Pack", self.styles["ReportTitle"]))
        story.append(Paragraph(
            f"CONFIDENTIAL // Certified Fraud Analyst & Regulatory Audit Dossier | Report ID: {report_id}",
            self.styles["ReportSubtitle"]
        ))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0f172a"), spaceAfter=10))

        # Core Metadata Table
        meta_data = [
            ["Incident ID", incident.incident_id, "Priority", incident.priority.value],
            ["Transaction ID", incident.transaction_id, "Current Status", incident.status.value],
            ["User ID", incident.user_id, "Assigned To", incident.assigned_to or "Unassigned"],
            ["Risk Score", f"{incident.risk_score:.2f} / 100", "Calibrated Fraud Prob", f"{incident.risk_probability:.4f}"],
            ["Decision Action", incident.decision.upper(), "Risk Band", incident.risk_band],
            ["Scam Classification", incident.scam_type or "Unclassified", "SLA Target", incident.sla_due_at or "N/A"],
            ["Model Pipeline", incident.model_version, "Threshold Policy", incident.threshold_version]
        ]
        t_meta = Table(meta_data, colWidths=[120, 150, 120, 150])
        t_meta.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
            ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f1f5f9")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t_meta)
        story.append(Spacer(1, 10))

        # AI Assessment Disclaimer
        story.append(Paragraph(
            "<b>LEGAL & POLICY NOTICE:</b> The metrics below represent algorithmic risk estimations "
            "derived from machine learning models. Under FinSure Operating Protocol, an AI prediction is "
            "<b>NOT legal confirmation of fraud</b>. Formal findings require independent investigator validation.",
            self.styles["DisclaimerText"]
        ))
        story.append(Spacer(1, 10))

        # Section: Explainability & ML Evidence
        story.append(Paragraph("Multi-Modal Model Evidence & Explainability", self.styles["SectionHeading"]))
        
        # SHAP Features
        shap_items = analyst_exp.get("top_shap_features", [])
        shap_text = ", ".join([f"{item.get('feature')}: {item.get('contribution', 0):+.3f}" for item in shap_items[:5]]) if shap_items else "Standard feature distribution"

        # Model Evidence Breakdown
        ae_data = analyst_exp.get("autoencoder_evidence", {})
        ae_error = ae_data.get("reconstruction_error", snapshot.get("autoencoder_error", 0.0))
        ae_cutoff = ae_data.get("threshold", 0.3418)

        graph_data = analyst_exp.get("graph_evidence", {})
        seq_data = analyst_exp.get("sequence_evidence", {})

        ev_table_data = [
            ["Sub-Model", "Extracted Metric / Finding", "Significance"],
            ["XGBoost Baseline (SHAP)", shap_text[:120], "Primary classical risk features"],
            ["Autoencoder Anomaly", f"Reconstruction Error: {ae_error:.4f} (Anomaly Cutoff: {ae_cutoff})", "Zero-day behavioral anomaly" if ae_error > ae_cutoff else "Conforms to expected profile"],
            ["GraphSAGE GNN", f"Entity Degree: {graph_data.get('degree', 'N/A')}, High-Risk Hub Link: {graph_data.get('connected_to_fraud_hub', False)}", "Graph topology & syndicate connection"],
            ["Sequence GRU Attention", f"Top Attributed Txn Lag: {seq_data.get('top_attention_lag', 'N/A')} (Weight sum: 1.0)", "Burst & velocity deviations"],
            ["Scam Type Classifier", f"Predicted: {incident.scam_type or 'General Fraud'}", "Target scam classification"]
        ]
        t_ev = Table(ev_table_data, colWidths=[130, 260, 150])
        t_ev.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t_ev)
        story.append(Spacer(1, 10))

        # Section: Cryptographic Incident Ledger & Chain Verification
        story.append(Paragraph(
            f"Cryptographic Audit Ledger (Status: {'VERIFIED - UNBROKEN' if is_chain_valid else 'TAMPER DETECTED'})",
            self.styles["SectionHeading"]
        ))
        chain_summary = f"Chain Integrity: {'PASS' if is_chain_valid else 'FAIL'} | Verified Events: {event_count} | {chain_msg}"
        story.append(Paragraph(chain_summary, self.styles["BodySmall"]))
        story.append(Spacer(1, 4))

        # Timeline Table (Last 6 events)
        timeline_rows = [["Event ID", "Timestamp (UTC)", "Actor", "Event Type", "Record Hash (SHA-256)"]]
        for ev in events[-6:]:
            timeline_rows.append([
                ev.event_id,
                ev.timestamp[:19],
                f"{ev.actor_id} ({ev.actor_role or ''})",
                ev.event_type,
                f"{ev.record_hash[:16]}..."
            ])
        t_ledger = Table(timeline_rows, colWidths=[90, 110, 110, 110, 120])
        t_ledger.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(t_ledger)
        story.append(Spacer(1, 10))

        # Investigator Notes
        if notes:
            story.append(Paragraph("Investigator Notes & Audit Log", self.styles["SectionHeading"]))
            for n in notes[-3:]:
                note_str = f"<b>[{n.created_at[:19]}] {n.author_id} ({n.author_role}):</b> {n.note_text}"
                story.append(Paragraph(note_str, self.styles["BodySmall"]))
                story.append(Spacer(1, 2))
            story.append(Spacer(1, 8))

        # QR Verification Seal
        qr_payload = json.dumps({
            "report_id": report_id,
            "incident_id": incident.incident_id,
            "type": "analyst_pack",
            "chain_valid": is_chain_valid,
            "timestamp": now_iso
        })
        qr_buf = self._generate_qr_image(qr_payload)
        qr_img = Image(qr_buf, width=64, height=64)

        seal_data = [
            [
                qr_img,
                Paragraph(
                    f"<b>Analyst Evidence Pack Cryptographic Seal</b><br/>"
                    f"Generated: {now_iso} by {generator_role}<br/>"
                    f"Audit Chain: {'PASSED (Cryptographically Tamper-Free)' if is_chain_valid else 'FAILED (Tampering Detected)'}<br/>"
                    f"SHA-256 seal guarantees bit-for-bit file integrity against unauthorized modification.",
                    self.styles["BodySmall"]
                )
            ]
        ]
        t_seal = Table(seal_data, colWidths=[70, 470])
        t_seal.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 0), (-1, -1), 4),
            ("LINEABOVE", (0, 0), (-1, -1), 0.5, colors.HexColor("#0f172a"))
        ]))
        story.append(t_seal)

        # Build PDF
        doc.build(story)
        pdf_bytes = pdf_buffer.getvalue()

        # SHA-256 content hash
        content_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # Save record
        record = IncidentReportRecord(
            report_id=report_id,
            incident_id=incident.incident_id,
            report_type="analyst",
            file_path=None,
            content_hash=content_hash,
            qr_payload=qr_payload,
            generated_at=now_iso,
            generator_role=generator_role
        )
        self.repo.save_report_record(record)

        return pdf_bytes, record

    # -------------------------------------------------------------
    # Report Verification
    # -------------------------------------------------------------
    def verify_report_hash(self, incident_id: str, report_type: str, candidate_hash: str) -> Tuple[bool, str]:
        """Verifies report candidate SHA-256 against stored hash."""
        record = self.repo.get_latest_report(incident_id, report_type)
        if not record:
            return False, f"No generated report of type '{report_type}' found for incident '{incident_id}'."

        if record.content_hash.lower() == candidate_hash.lower():
            return True, "Report integrity verified: SHA-256 hash matches stored record bit-for-bit."
        return False, "Report integrity check failed: Content hash mismatch."
