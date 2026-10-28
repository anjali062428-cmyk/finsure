"""
FinSure Real-Time Inference Orchestration Service
Orchestrates the entire prediction pipeline:
Request -> Feature Prep -> Base Models -> Ensemble Brain -> Decision Engine -> Explainability -> Audit Trail.
Target SLA: Sub-100ms P95 latency.
"""

import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
import torch
import pandas as pd

from backend.services.model_service import ModelRegistry
from backend.services.feature_service import RealTimeFeatureService
from backend.services.profile_service import ProfileService
from backend.api.schemas.transaction import TransactionScoreRequest, CanonicalTransactionScoreResponse
from ml.data.deep_datasets import SCAM_CLASSES
from ml.explainability.explanation_formatter import ExplanationFormatter

logger = logging.getLogger("finsure.inference_service")

KEY_GRAPH_FEATURES = [
    "log_amount",
    "hour",
    "is_night",
    "is_weekend",
    "is_new_payee",
    "is_new_device",
    "dist_from_prev_txn_km",
    "implied_travel_speed_kmh",
    "user_daily_limit_ratio",
    "amt_user_zscore"
]


class InferenceService:
    """
    Central inference engine serving live scoring requests.
    """
    def __init__(
        self,
        model_registry: Optional[ModelRegistry] = None,
        feature_service: Optional[RealTimeFeatureService] = None,
        profile_service: Optional[ProfileService] = None
    ):
        self.registry = model_registry or ModelRegistry.get_instance()
        if not self.registry.is_loaded:
            self.registry.load_all_artifacts()

        self.feature_service = feature_service or RealTimeFeatureService()
        self.profile_service = profile_service or ProfileService()

    def score_transaction(
        self,
        request: TransactionScoreRequest
    ) -> Tuple[CanonicalTransactionScoreResponse, Dict[str, float]]:
        """
        Executes end-to-end real-time scoring.
        Returns:
            response: Canonical response object.
            stage_latencies: Timing breakdown in milliseconds.
        """
        t_start = time.perf_counter()
        latencies = {}

        txn_id = request.transaction_id or f"TXN_{uuid.uuid4().hex[:12].upper()}"
        decision_id = f"DEC_{uuid.uuid4().hex[:12].upper()}"
        iso_timestamp = request.timestamp.isoformat() if request.timestamp else datetime.now(timezone.utc).isoformat()

        # -------------------------------------------------------------
        # 1. State & Feature Preparation
        # -------------------------------------------------------------
        t0 = time.perf_counter()
        profile = self.profile_service.get_user_profile(request.user_id)
        history = self.profile_service.get_user_history(request.user_id, limit=50)
        familiarity = self.profile_service.get_user_familiarity(request.user_id, request.payee_id, request.device_id)

        txn_dict = request.model_dump()
        features_raw, feat_dict = self.feature_service.compute_features(
            transaction=txn_dict,
            profile=profile,
            history=history,
            familiarity=familiarity
        )
        # Scaled features for neural networks
        df_feat = pd.DataFrame([features_raw], columns=self.feature_service.feature_columns)
        features_scaled = self.registry.scaler.transform(df_feat)[0].astype(np.float32)

        # Build sequence tensors (history strictly excludes current transaction)
        seq_tensor, mask_tensor = self.feature_service.build_sequence_tensors(history, max_seq_len=50)
        latencies["feature_prep_ms"] = round((time.perf_counter() - t0) * 1000.0, 3)

        # -------------------------------------------------------------
        # 2. Base Model Inferences
        # -------------------------------------------------------------
        # 2a. XGBoost Baseline (raw features)
        t_xgb = time.perf_counter()
        prob_xgb = float(self.registry.xgb_model.predict_proba(features_raw.reshape(1, -1))[0, 1])
        latencies["xgboost_ms"] = round((time.perf_counter() - t_xgb) * 1000.0, 3)

        # 2b. Sequence Model (GRU + Attention Pooling)
        t_seq = time.perf_counter()
        with torch.no_grad():
            seq_t = torch.tensor(seq_tensor, dtype=torch.float32)
            mask_t = torch.tensor(mask_tensor, dtype=torch.bool)
            cur_t = torch.tensor(features_scaled.reshape(1, -1), dtype=torch.float32)
            seq_logits, seq_attn_weights = self.registry.seq_model(seq_t, mask_t, cur_t)
            prob_seq = float(torch.sigmoid(seq_logits).item())
        latencies["sequence_ms"] = round((time.perf_counter() - t_seq) * 1000.0, 3)

        # 2c. GraphSAGE (Cached Entity Representations)
        t_gnn = time.perf_counter()
        u_key = f"user:{request.user_id}"
        p_key = f"payee:{request.payee_id}"
        d_key = f"device:{request.device_id}"

        u_embed = self.registry.cached_embeddings.get(u_key, np.zeros(32, dtype=np.float32))
        p_embed = self.registry.cached_embeddings.get(p_key, np.zeros(32, dtype=np.float32))
        d_embed = self.registry.cached_embeddings.get(d_key, np.zeros(32, dtype=np.float32))

        key_graph_vals = np.array([feat_dict.get(k, 0.0) for k in KEY_GRAPH_FEATURES], dtype=np.float32)
        with torch.no_grad():
            u_t = torch.tensor(u_embed.reshape(1, -1), dtype=torch.float32)
            p_t = torch.tensor(p_embed.reshape(1, -1), dtype=torch.float32)
            d_t = torch.tensor(d_embed.reshape(1, -1), dtype=torch.float32)
            k_t = torch.tensor(key_graph_vals.reshape(1, -1), dtype=torch.float32)
            gnn_logits = self.registry.gnn_model.forward_edges(u_t, p_t, d_t, k_t)
            prob_gnn = float(torch.sigmoid(gnn_logits).item())
        latencies["graphsage_ms"] = round((time.perf_counter() - t_gnn) * 1000.0, 3)

        # 2d. Deep Autoencoder (Anomaly Detection)
        t_ae = time.perf_counter()
        with torch.no_grad():
            x_t = torch.tensor(features_scaled.reshape(1, -1), dtype=torch.float32)
            score_ae = float(self.registry.ae_model.get_anomaly_score(features_scaled.reshape(1, -1))[0])
            rec_x, _ = self.registry.ae_model(x_t)
            rec_mse = float(torch.mean((x_t - rec_x) ** 2).item())
        latencies["autoencoder_ms"] = round((time.perf_counter() - t_ae) * 1000.0, 3)

        # 2e. Scam Classifier Head
        with torch.no_grad():
            scam_probs = self.registry.scam_model.predict_proba(features_scaled.reshape(1, -1))[0]
            top_scam_idx = int(np.argmax(scam_probs))
            top_scam_class = SCAM_CLASSES[top_scam_idx]
            top_scam_conf = float(scam_probs[top_scam_idx])

        # -------------------------------------------------------------
        # 3. Calibrated Meta-Learner (Ensemble Brain)
        # -------------------------------------------------------------
        t_meta = time.perf_counter()
        # [prob_xgb, prob_seq, prob_gnn, score_ae, log_amount, is_new_device, is_new_payee, amt_user_zscore]
        meta_z = np.array([
            prob_xgb,
            prob_seq,
            prob_gnn,
            score_ae,
            feat_dict["log_amount"],
            feat_dict["is_new_device"],
            feat_dict["is_new_payee"],
            feat_dict["amt_user_zscore"]
        ], dtype=np.float32).reshape(1, -1)

        calibrated_prob = float(self.registry.meta_learner.predict_calibrated_proba(meta_z)[0])
        calibrated_prob = max(0.0, min(1.0, calibrated_prob))
        latencies["meta_learner_ms"] = round((time.perf_counter() - t_meta) * 1000.0, 3)

        # -------------------------------------------------------------
        # 4. Decision Engine
        # -------------------------------------------------------------
        decision_payload = self.registry.decision_engine.evaluate_decision(
            calibrated_probability=calibrated_prob,
            transaction_id=txn_id,
            timestamp=iso_timestamp
        )
        risk_score = decision_payload["risk_score"]
        risk_band = decision_payload["risk_band"]
        action = decision_payload["action"]

        # -------------------------------------------------------------
        # 5. Multi-Modal Explainability
        # -------------------------------------------------------------
        t_exp = time.perf_counter()
        shap_res = self.registry.shap_explainer.explain_instance(features_raw, top_k=5)
        seq_res = self.registry.seq_explainer.explain_sequence(
            seq_tensor[0],
            mask_tensor[0],
            features_scaled,
            raw_history_metadata=history,
            top_k=5
        )
        graph_res = self.registry.graph_explainer.explain_relationships(
            user_id=request.user_id,
            payee_id=request.payee_id,
            device_id=request.device_id,
            raw_graph_features=feat_dict
        )
        ae_res = self.registry.ae_explainer.explain_anomaly(
            features_scaled,
            is_already_scaled=True,
            top_k=5
        )

        scam_res = {
            "scam_type": top_scam_class,
            "confidence": round(top_scam_conf, 4),
            "probabilities": {SCAM_CLASSES[i]: round(float(scam_probs[i]), 4) for i in range(len(SCAM_CLASSES))}
        }

        # Reason Codes
        triggered_codes = self.registry.reason_engine.evaluate_reason_codes(
            features=feat_dict,
            graph_evidence=graph_res,
            ae_evidence=ae_res,
            seq_evidence=seq_res
        )

        # Bilingual Customer & Analyst Formatting
        customer_explanation = self.registry.shap_explainer and ExplanationFormatter.format_customer_explanation(
            action=action,
            reason_codes=triggered_codes,
            language=request.language or "en"
        )
        analyst_explanation = ExplanationFormatter.format_analyst_explanation(
            transaction_id=txn_id,
            risk_score=risk_score,
            risk_band=risk_band,
            calibrated_probability=calibrated_prob,
            action=action,
            policy_version=self.registry.threshold_version,
            shap_explanation=shap_res,
            sequence_explanation=seq_res,
            graph_explanation=graph_res,
            autoencoder_explanation=ae_res,
            scam_prediction=scam_res,
            reason_codes=triggered_codes
        )
        latencies["explainability_ms"] = round((time.perf_counter() - t_exp) * 1000.0, 3)

        # -------------------------------------------------------------
        # 6. Cryptographic Audit Trail
        # -------------------------------------------------------------
        t_audit = time.perf_counter()
        full_explanation_payload = {
            "customer": customer_explanation,
            "analyst": analyst_explanation
        }
        reason_code_strings = [c["code"] for c in triggered_codes]
        audit_record = self.registry.audit_trail.append(
            decision_id=decision_id,
            transaction_id=txn_id,
            risk_score=risk_score,
            action=action,
            reason_codes=reason_code_strings,
            explanation_payload=full_explanation_payload,
            timestamp=iso_timestamp
        )
        latencies["audit_trail_ms"] = round((time.perf_counter() - t_audit) * 1000.0, 3)

        # -------------------------------------------------------------
        # 7. Update State / Profile History
        # -------------------------------------------------------------
        self.profile_service.record_transaction({
            "transaction_id": txn_id,
            "timestamp": iso_timestamp,
            "amount": request.amount,
            "user_id": request.user_id,
            "payee_id": request.payee_id,
            "device_id": request.device_id,
            "channel": request.channel,
            "city": request.city or "Mumbai"
        })

        # Total latency
        total_time_ms = round((time.perf_counter() - t_start) * 1000.0, 3)
        latencies["total_inference_ms"] = total_time_ms

        response = CanonicalTransactionScoreResponse(
            transaction_id=txn_id,
            risk_score=risk_score,
            risk_probability=round(calibrated_prob, 4),
            risk_band=risk_band,
            decision=action,
            reason_codes=reason_code_strings,
            customer_explanation=customer_explanation,
            analyst_explanation=analyst_explanation,
            model_version=self.registry.model_version,
            threshold_version=self.registry.threshold_version,
            scored_at=iso_timestamp,
            audit_record_id=audit_record.record_id,
            latency_ms=total_time_ms
        )

        return response, latencies
