"""
FinSure Cryptographic Explanation Audit Trail
Maintains a tamper-evident, SHA-256 hash-chained log of risk decisions and explanations.
Ensures regulatory compliance, non-repudiation, and verifiable audit trails.
Reference: Master Prompt v2 Section 7.7 and FinSure SRS v2 Section 3.3.
"""

import os
import json
import hashlib
import uuid
import datetime
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, asdict

GENESIS_HASH = "0" * 64


@dataclass
class AuditRecord:
    record_id: str
    decision_id: str
    transaction_id: str
    timestamp: str
    risk_score: int
    action: str
    reason_codes: List[str]
    explanation_payload_hash: str
    prev_record_hash: str
    record_hash: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AuditRecord":
        return cls(**data)


class ExplanationAuditTrail:
    """
    Append-only, SHA-256 hash-chained ledger of decision explanations.
    """
    def __init__(self, records: Optional[List[AuditRecord]] = None):
        self.records: List[AuditRecord] = records or []

    @staticmethod
    def hash_payload(payload: Any) -> str:
        """Computes deterministic SHA-256 hash of any JSON-serializable structure."""
        canonical_json = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    @staticmethod
    def compute_record_hash(
        record_id: str,
        decision_id: str,
        transaction_id: str,
        timestamp: str,
        risk_score: int,
        action: str,
        reason_codes: List[str],
        explanation_payload_hash: str,
        prev_record_hash: str
    ) -> str:
        """Computes canonical SHA-256 hash for an audit record."""
        sorted_codes = ",".join(sorted(str(c) for c in reason_codes))
        raw_msg = (
            f"{record_id}|{decision_id}|{transaction_id}|{timestamp}|"
            f"{int(risk_score)}|{action}|{sorted_codes}|"
            f"{explanation_payload_hash}|{prev_record_hash}"
        )
        return hashlib.sha256(raw_msg.encode("utf-8")).hexdigest()

    def append(
        self,
        decision_id: str,
        transaction_id: str,
        risk_score: int,
        action: str,
        reason_codes: List[str],
        explanation_payload: Dict[str, Any],
        timestamp: Optional[str] = None
    ) -> AuditRecord:
        """
        Creates and appends a new cryptographically chained audit record.
        """
        record_id = str(uuid.uuid4())
        ts = timestamp or datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        prev_hash = self.records[-1].record_hash if self.records else GENESIS_HASH
        expl_hash = self.hash_payload(explanation_payload)

        rec_hash = self.compute_record_hash(
            record_id=record_id,
            decision_id=decision_id,
            transaction_id=transaction_id,
            timestamp=ts,
            risk_score=risk_score,
            action=action,
            reason_codes=reason_codes,
            explanation_payload_hash=expl_hash,
            prev_record_hash=prev_hash
        )

        record = AuditRecord(
            record_id=record_id,
            decision_id=decision_id,
            transaction_id=transaction_id,
            timestamp=ts,
            risk_score=int(risk_score),
            action=action,
            reason_codes=list(reason_codes),
            explanation_payload_hash=expl_hash,
            prev_record_hash=prev_hash,
            record_hash=rec_hash
        )

        self.records.append(record)
        return record

    def verify_chain(self) -> Tuple[bool, Optional[str]]:
        """
        Verifies the cryptographic integrity of the entire audit trail.
        Returns:
            (True, None) if the entire chain is valid and untampered.
            (False, error_description) if any record or hash linkage has been compromised.
        """
        if not self.records:
            return True, None

        for idx, rec in enumerate(self.records):
            expected_prev = self.records[idx - 1].record_hash if idx > 0 else GENESIS_HASH
            if rec.prev_record_hash != expected_prev:
                return False, f"Broken chain link at record index {idx} ({rec.record_id}): expected prev_hash {expected_prev}, got {rec.prev_record_hash}"

            recomputed_hash = self.compute_record_hash(
                record_id=rec.record_id,
                decision_id=rec.decision_id,
                transaction_id=rec.transaction_id,
                timestamp=rec.timestamp,
                risk_score=rec.risk_score,
                action=rec.action,
                reason_codes=rec.reason_codes,
                explanation_payload_hash=rec.explanation_payload_hash,
                prev_record_hash=rec.prev_record_hash
            )

            if rec.record_hash != recomputed_hash:
                return False, f"Hash mismatch at record index {idx} ({rec.record_id}): computed {recomputed_hash}, stored {rec.record_hash}"

        return True, None

    def export_json(self) -> str:
        """Exports audit records to JSON string."""
        return json.dumps([r.to_dict() for r in self.records], indent=2)

    def save(self, filepath: str):
        """Saves audit trail to disk."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(self.export_json())

    @classmethod
    def load(cls, filepath: str) -> "ExplanationAuditTrail":
        """Loads audit trail from disk."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        records = [AuditRecord.from_dict(d) for d in data]
        return cls(records=records)
