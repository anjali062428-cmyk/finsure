"""
FinSure Deterministic Similar Cases Retrieval Service
Computes statistical similarity (kNN / Euclidean-Cosine distance over normalized features)
to retrieve relevant forensic reference cases.
Never relies on LLMs or non-deterministic mechanisms.
"""

import math
import logging
from typing import List, Dict, Any, Optional

from backend.models.incident import Incident, SimilarCaseResult
from backend.repositories.incident_repo import IncidentRepository

logger = logging.getLogger("finsure.similarity_service")


class SimilarCaseService:
    """Deterministic statistical case-matcher for fraud investigations."""

    def __init__(self, incident_repo: IncidentRepository):
        self.repo = incident_repo

    def find_similar_cases(self, incident_id: str, top_k: int = 3) -> List[SimilarCaseResult]:
        """
        Finds the top-k most statistically similar historical incidents.
        Computes deterministic distance over normalized score, probability, and transaction scale.
        """
        target = self.repo.get_incident_by_id(incident_id)
        if not target:
            raise ValueError(f"Target incident '{incident_id}' not found.")

        all_incidents = self.repo.list_incidents(limit=200)
        candidates = [inc for inc in all_incidents if inc.incident_id != incident_id]

        if not candidates:
            return []

        target_score = target.risk_score / 100.0
        target_prob = target.risk_probability
        target_snap = target.scoring_snapshot or {}
        target_amt = float(target_snap.get("amount", 1000.0))
        target_log_amt = math.log10(max(1.0, target_amt))

        scored_candidates = []
        for cand in candidates:
            cand_score = cand.risk_score / 100.0
            cand_prob = cand.risk_probability
            cand_snap = cand.scoring_snapshot or {}
            cand_amt = float(cand_snap.get("amount", 1000.0))
            cand_log_amt = math.log10(max(1.0, cand_amt))

            # Feature distances
            score_diff = abs(target_score - cand_score)
            prob_diff = abs(target_prob - cand_prob)
            amt_diff = min(1.0, abs(target_log_amt - cand_log_amt) / 4.0)
            scam_match = 1.0 if (target.scam_type and cand.scam_type and target.scam_type == cand.scam_type) else 0.0

            # Weighted Euclidean distance: weights sum to 1.0
            # [score: 0.35, prob: 0.25, amount: 0.20, scam_type: 0.20]
            dist_sq = (
                0.35 * (score_diff ** 2) +
                0.25 * (prob_diff ** 2) +
                0.20 * (amt_diff ** 2) +
                0.20 * ((1.0 - scam_match) ** 2)
            )
            dist = math.sqrt(dist_sq)
            similarity = max(0.0, min(1.0, round(1.0 - dist, 4)))

            matching_features = []
            if scam_match == 1.0:
                matching_features.append(f"Matching Scam Category: {target.scam_type}")
            if score_diff < 0.10:
                matching_features.append("Congruent Risk Band and Severity")
            if amt_diff < 0.15:
                matching_features.append("Comparable Transaction Amount Scale")

            if not matching_features:
                matching_features.append("General Algorithmic Topology")

            scored_candidates.append(SimilarCaseResult(
                similar_incident_id=cand.incident_id,
                transaction_id=cand.transaction_id,
                similarity_score=similarity,
                risk_score=cand.risk_score,
                scam_type=cand.scam_type,
                status=cand.status.value,
                matching_features=matching_features
            ))

        # Sort descending by similarity
        scored_candidates.sort(key=lambda x: x.similarity_score, reverse=True)
        return scored_candidates[:top_k]
