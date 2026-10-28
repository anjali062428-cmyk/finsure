"""
FinSure Graph Relationship Explainer
Inspects entity graph connections across User, Payee, and Device nodes.
Leverages precomputed node representations from cached_embeddings.joblib and graph adjacency.
Reference: Master Prompt v2 Section 7.3 and FinSure SRS v2 Section 3.3.
"""

import os
import logging
from typing import Dict, List, Tuple, Optional, Any, Set
import numpy as np
import joblib

logger = logging.getLogger("finsure.graph_explainer")

DEFAULT_EMBEDDINGS_PATH = os.path.join("ml", "artifacts", "cached_embeddings.joblib")


class GraphEvidenceExplainer:
    """
    Extracts topological and embedding-based relationship evidence for transactions.
    """
    def __init__(
        self,
        embeddings_path: str = DEFAULT_EMBEDDINGS_PATH,
        device_to_users_map: Optional[Dict[str, Set[str]]] = None,
        payee_to_users_map: Optional[Dict[str, Set[str]]] = None
    ):
        self.embeddings_path = embeddings_path
        self.cached_embeddings: Dict[str, np.ndarray] = {}
        self.device_to_users: Dict[str, Set[str]] = device_to_users_map or {}
        self.payee_to_users: Dict[str, Set[str]] = payee_to_users_map or {}

        if os.path.exists(self.embeddings_path):
            try:
                self.cached_embeddings = joblib.load(self.embeddings_path)
                logger.info(f"Loaded {len(self.cached_embeddings)} entity embeddings from {self.embeddings_path}")
            except Exception as e:
                logger.warning(f"Failed to load cached embeddings: {e}")
        else:
            logger.warning(f"Cached embeddings artifact not found at {self.embeddings_path}")

    def register_graph_edges(self, user_id: str, payee_id: str, device_id: str):
        """Dynamically registers or updates known edges in the local entity graph."""
        if device_id:
            if device_id not in self.device_to_users:
                self.device_to_users[device_id] = set()
            self.device_to_users[device_id].add(str(user_id))

        if payee_id:
            if payee_id not in self.payee_to_users:
                self.payee_to_users[payee_id] = set()
            self.payee_to_users[payee_id].add(str(user_id))

    def explain_relationships(
        self,
        user_id: str,
        payee_id: str,
        device_id: str,
        raw_graph_features: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyzes graph relationships for a given transaction tuple.
        Returns:
            Structured graph evidence containing cache status, shared device counts,
            payee in-degree, embedding cosine similarities, and analyst narrative.
        """
        user_key = f"user:{user_id}"
        payee_key = f"payee:{payee_id}"
        device_key = f"device:{device_id}"

        has_user_embed = user_key in self.cached_embeddings
        has_payee_embed = payee_key in self.cached_embeddings
        has_device_embed = device_key in self.cached_embeddings

        # Compute cosine similarities if embeddings are cached
        u_embed = self.cached_embeddings.get(user_key)
        p_embed = self.cached_embeddings.get(payee_key)
        d_embed = self.cached_embeddings.get(device_key)

        def _cosine_sim(a: Optional[np.ndarray], b: Optional[np.ndarray]) -> Optional[float]:
            if a is None or b is None:
                return None
            norm_a = np.linalg.norm(a)
            norm_b = np.linalg.norm(b)
            if norm_a == 0 or norm_b == 0:
                return 0.0
            return float(np.dot(a, b) / (norm_a * norm_b))

        user_payee_sim = _cosine_sim(u_embed, p_embed)
        user_device_sim = _cosine_sim(u_embed, d_embed)

        # Inspect entity linkage
        linked_users_on_device = list(self.device_to_users.get(device_id, {user_id}))
        is_shared_device = len(linked_users_on_device) > 1

        users_paying_target_payee = list(self.payee_to_users.get(payee_id, {user_id}))
        payee_in_degree = len(users_paying_target_payee)
        is_high_indegree_payee = payee_in_degree >= 5

        # Build evidence items
        evidence_items = []
        if not has_device_embed or (raw_graph_features and raw_graph_features.get("is_new_device", 0) == 1):
            evidence_items.append("Unseen device with no prior entity graph representation.")
        if is_shared_device:
            evidence_items.append(f"Device {device_id} is linked to {len(linked_users_on_device)} distinct user accounts.")
        if not has_payee_embed or (raw_graph_features and raw_graph_features.get("is_new_payee", 0) == 1):
            evidence_items.append(f"First-time transfer to payee {payee_id} (absent from user's historical subgraph).")
        if is_high_indegree_payee:
            evidence_items.append(f"Payee {payee_id} is an active hub node linked to {payee_in_degree} distinct payers.")

        # Summary narrative
        if is_shared_device and (not has_device_embed or raw_graph_features and raw_graph_features.get("is_new_device")):
            narrative = (
                f"Critical graph risk: Transaction originated from device {device_id}, which is shared across "
                f"{len(linked_users_on_device)} user accounts and exhibits high mule/takeover clustering."
            )
        elif not has_payee_embed and (raw_graph_features and raw_graph_features.get("is_new_payee", 0) == 1):
            narrative = (
                f"Payee node {payee_id} has no historical 1-hop relationship with user {user_id}. "
                f"Graph distance indicates an unfamiliar recipient."
            )
        else:
            narrative = "Entity graph topology shows standard 1-hop familiarity between user, device, and beneficiary."

        return {
            "user_id": str(user_id),
            "payee_id": str(payee_id),
            "device_id": str(device_id),
            "node_cache_status": {
                "user_cached": has_user_embed,
                "payee_cached": has_payee_embed,
                "device_cached": has_device_embed
            },
            "similarity_metrics": {
                "user_payee_embedding_cosine": round(user_payee_sim, 4) if user_payee_sim is not None else None,
                "user_device_embedding_cosine": round(user_device_sim, 4) if user_device_sim is not None else None
            },
            "topology_evidence": {
                "is_shared_device": is_shared_device,
                "device_account_count": len(linked_users_on_device),
                "payee_in_degree": payee_in_degree,
                "is_high_indegree_payee": is_high_indegree_payee,
                "evidence_items": evidence_items
            },
            "graph_narrative": narrative
        }
