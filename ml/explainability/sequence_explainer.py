"""
FinSure Sequence Attention Explainer
Extracts attention weights from the Deep Sequence Model (GRU + Attention Pooling).
Ranks historical transactions by model attention without asserting causality.
Reference: Master Prompt v2 Section 7.2 and FinSure SRS v2 Section 3.3.
"""

import os
import logging
from typing import Dict, List, Tuple, Optional, Any, Union
import numpy as np
import torch

from ml.models.sequence_model import FinSureSequenceModel

logger = logging.getLogger("finsure.sequence_explainer")

DEFAULT_MODEL_PATH = os.path.join("ml", "artifacts", "sequence_model.pt")


class SequenceAttentionExplainer:
    """
    Extracts and ranks attention weights from the historical sequence model.
    """
    def __init__(
        self,
        model_path: str = DEFAULT_MODEL_PATH,
        step_dim: int = 12,
        current_dim: int = 36,
        hidden_dim: int = 64
    ):
        self.model_path = model_path
        self.step_dim = step_dim
        self.current_dim = current_dim
        self.hidden_dim = hidden_dim
        self.model = FinSureSequenceModel(
            step_dim=step_dim,
            current_dim=current_dim,
            hidden_dim=hidden_dim
        )
        self.is_loaded = False

        if os.path.exists(self.model_path):
            state_dict = torch.load(self.model_path, map_location="cpu")
            self.model.load_state_dict(state_dict)
            self.model.eval()
            self.is_loaded = True
            logger.info(f"Loaded Sequence Model for attention explanations from {self.model_path}")
        else:
            logger.warning(f"Sequence model artifact {self.model_path} not found.")

    def explain_sequence(
        self,
        sequence: Union[np.ndarray, torch.Tensor],
        mask: Union[np.ndarray, torch.Tensor],
        current_features: Union[np.ndarray, torch.Tensor],
        raw_history_metadata: Optional[List[Dict[str, Any]]] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Computes attention distribution over past transactions.
        Args:
            sequence: (seq_len, 12) or (1, seq_len, 12)
            mask: (seq_len,) or (1, seq_len) boolean mask (True = valid, False = pad)
            current_features: (36,) or (1, 36)
            raw_history_metadata: Optional list of past transaction dicts (most recent first or chronological)
            top_k: Number of top attended historical steps to highlight.
        Returns:
            Dict containing attention weights, ranked steps, and non-causal attention narrative.
        """
        if not self.is_loaded:
            raise RuntimeError(f"Sequence model artifact not loaded from {self.model_path}")

        # Format tensors
        if isinstance(sequence, np.ndarray):
            seq_t = torch.tensor(sequence, dtype=torch.float32)
        else:
            seq_t = sequence.float()

        if isinstance(mask, np.ndarray):
            mask_t = torch.tensor(mask, dtype=torch.bool)
        else:
            mask_t = mask.bool()

        if isinstance(current_features, np.ndarray):
            cur_t = torch.tensor(current_features, dtype=torch.float32)
        else:
            cur_t = current_features.float()

        if seq_t.ndim == 2:
            seq_t = seq_t.unsqueeze(0)
        if mask_t.ndim == 1:
            mask_t = mask_t.unsqueeze(0)
        if cur_t.ndim == 1:
            cur_t = cur_t.unsqueeze(0)

        with torch.no_grad():
            logits, attn_weights = self.model(seq_t, mask_t, cur_t)
            prob = float(torch.sigmoid(logits).item())
            weights_arr = attn_weights.cpu().numpy()[0]
            mask_arr = mask_t.cpu().numpy()[0]

        valid_count = int(np.sum(mask_arr))
        weight_sum = float(np.sum(weights_arr))

        ranked_steps = []
        if valid_count > 0:
            # Enumerate only valid positions
            valid_indices = np.where(mask_arr)[0]
            # Rank indices by descending weight
            sorted_indices = sorted(valid_indices, key=lambda idx: weights_arr[idx], reverse=True)

            for rank, idx in enumerate(sorted_indices[:top_k], start=1):
                w = float(weights_arr[idx])
                pct = round(w * 100.0, 2)
                
                step_meta = {}
                if raw_history_metadata and idx < len(raw_history_metadata):
                    step_meta = raw_history_metadata[idx]

                ranked_steps.append({
                    "rank": rank,
                    "step_index": int(idx),
                    "relative_step": f"t-{valid_count - idx}",
                    "attention_weight": round(w, 4),
                    "attention_percentage": pct,
                    "metadata": step_meta
                })

        # Generate non-causal explanation narrative
        if valid_count == 0:
            narrative = "No prior transaction history available for this account. Attention allocated uniformly to current transaction features."
        else:
            top_step = ranked_steps[0]
            narrative = (
                f"Historical sequence context: Step {top_step['relative_step']} received highest temporal "
                f"attention ({top_step['attention_percentage']}% of sequence weight), indicating that the recurrent "
                f"network prioritized patterns observed in this past transaction. Note: High attention indicates "
                f"temporal relevance in the sequence representation, not direct causality."
            )

        return {
            "sequence_model_probability": round(prob, 4),
            "valid_history_length": valid_count,
            "weights_sum": round(weight_sum, 4),
            "attention_weights": [round(float(w), 4) for w in weights_arr],
            "ranked_steps": ranked_steps,
            "narrative": narrative
        }
