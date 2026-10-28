"""
FinSure Multi-Modal Explanation Formatter
Enforces strict architectural isolation:
1. Customer-Facing View: Non-technical, calm, bilingual (EN/HI), zero internal leakage.
2. Analyst-Facing View: Full technical transparency (signed SHAP values, sequence attention,
   graph linkage, autoencoder reconstruction error, scam typology, and reason codes).
Reference: Master Prompt v2 Section 7.6 and FinSure SRS v2 Section 3.3.
"""

from typing import Dict, List, Optional, Any, Union
import numpy as np


class ExplanationFormatter:
    """
    Formats multi-modal explainability outputs into customer-facing and analyst-facing payloads.
    """

    @staticmethod
    def format_customer_explanation(
        action: str,
        reason_codes: List[Dict[str, Any]],
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Generates a non-technical, calm, bilingual customer-facing message.
        Guarantees ZERO leakage of internal model names, SHAP scores, or thresholds.
        """
        lang = "hi" if language.lower() in ["hi", "hindi"] else "en"

        action_messages = {
            "approve": {
                "en": {
                    "header": "Payment Approved",
                    "message": "Your payment has been processed successfully.",
                    "instruction": "No further action is required."
                },
                "hi": {
                    "header": "भुगतान स्वीकृत",
                    "message": "आपका भुगतान सफलतापूर्वक पूरा हो गया है।",
                    "instruction": "किसी अतिरिक्त कार्रवाई की आवश्यकता नहीं है।"
                }
            },
            "step_up": {
                "en": {
                    "header": "Additional Security Verification Required",
                    "message": "For your protection, we noticed slightly unusual details for this transaction.",
                    "instruction": "Please enter the one-time verification passcode (OTP) sent to your registered mobile number."
                },
                "hi": {
                    "header": "अतिरिक्त सुरक्षा सत्यापन आवश्यक",
                    "message": "आपकी सुरक्षा के लिए, इस लेन-देन में कुछ असामान्य विवरण देखे गए हैं।",
                    "instruction": "कृपया अपने पंजीकृत मोबाइल नंबर पर भेजा गया वन-टाइम पासवर्ड (OTP) दर्ज करें।"
                }
            },
            "cooling_period": {
                "en": {
                    "header": "Security Hold Applied",
                    "message": "As a fraud-prevention safeguard for high-value or unfamiliar transfers, this transaction is placed on a temporary 2-hour security hold.",
                    "instruction": "Funds will be released automatically after verification. If you did not initiate this, freeze your account immediately in the app."
                },
                "hi": {
                    "header": "सुरक्षा होल्ड लागू",
                    "message": "अपरिचित या बड़े ट्रांसफर की सुरक्षा के लिए, इस लेन-देन पर 2 घंटे का अस्थायी सुरक्षा होल्ड लगाया गया है।",
                    "instruction": "सत्यापन के बाद राशि स्वतः ट्रांसफर हो जाएगी। यदि आपने यह लेन-देन नहीं किया है, तो ऐप में तुरंत खाता फ्रीज करें।"
                }
            },
            "block": {
                "en": {
                    "header": "Transaction Declined for Account Protection",
                    "message": "This payment was declined due to security policies safeguarding your account against unauthorized access.",
                    "instruction": "If you authorized this transaction, please contact 24/7 bank support through your app to verify your identity."
                },
                "hi": {
                    "header": "खाता सुरक्षा हेतु लेन-देन अस्वीकृत",
                    "message": "अनधिकृत पहुंच से आपके खाते की सुरक्षा के लिए यह भुगतान अस्वीकार कर दिया गया है।",
                    "instruction": "यदि आपने यह लेन-देन किया है, तो पहचान सत्यापित करने के लिए कृपया ऐप के माध्यम से 24/7 बैंक सहायता से संपर्क करें।"
                }
            }
        }

        act_key = action if action in action_messages else "approve"
        selected_act = action_messages[act_key][lang]

        # Select at most 2 high-level friendly reason descriptions
        customer_reasons = []
        for rc in reason_codes[:2]:
            desc_dict = rc.get(lang, {})
            title = desc_dict.get("title")
            desc = desc_dict.get("description")
            if title and desc:
                customer_reasons.append({
                    "title": title,
                    "summary": desc
                })

        return {
            "language": lang,
            "status": act_key,
            "header": selected_act["header"],
            "message": selected_act["message"],
            "instruction": selected_act["instruction"],
            "safety_highlights": customer_reasons
        }

    @staticmethod
    def format_analyst_explanation(
        transaction_id: str,
        risk_score: int,
        risk_band: str,
        calibrated_probability: float,
        action: str,
        policy_version: str,
        shap_explanation: Optional[Dict[str, Any]] = None,
        sequence_explanation: Optional[Dict[str, Any]] = None,
        graph_explanation: Optional[Dict[str, Any]] = None,
        autoencoder_explanation: Optional[Dict[str, Any]] = None,
        scam_prediction: Optional[Dict[str, Any]] = None,
        reason_codes: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generates full technical explainability payload for fraud analysts and investigators.
        """
        return {
            "meta": {
                "transaction_id": str(transaction_id),
                "policy_version": str(policy_version),
                "risk_score": int(risk_score),
                "risk_band": str(risk_band),
                "calibrated_probability": round(float(calibrated_probability), 4),
                "recommended_action": str(action)
            },
            "reason_codes": [rc.get("code") for rc in (reason_codes or [])],
            "reason_code_details": reason_codes or [],
            "xgboost_shap": {
                "base_value": shap_explanation.get("base_value") if shap_explanation else None,
                "top_positive_factors": shap_explanation.get("top_positive_factors", []) if shap_explanation else [],
                "top_negative_factors": shap_explanation.get("top_negative_factors", []) if shap_explanation else []
            },
            "temporal_sequence": {
                "sequence_probability": sequence_explanation.get("sequence_model_probability") if sequence_explanation else None,
                "history_length": sequence_explanation.get("valid_history_length") if sequence_explanation else 0,
                "ranked_steps": sequence_explanation.get("ranked_steps", []) if sequence_explanation else [],
                "narrative": sequence_explanation.get("narrative") if sequence_explanation else "No sequence context."
            },
            "entity_graph": {
                "topology_evidence": graph_explanation.get("topology_evidence", {}) if graph_explanation else {},
                "similarity_metrics": graph_explanation.get("similarity_metrics", {}) if graph_explanation else {},
                "narrative": graph_explanation.get("graph_narrative") if graph_explanation else "No graph context."
            },
            "unsupervised_autoencoder": {
                "reconstruction_mse": autoencoder_explanation.get("reconstruction_mse") if autoencoder_explanation else None,
                "frozen_threshold": autoencoder_explanation.get("frozen_threshold") if autoencoder_explanation else 0.3418,
                "is_zero_day_anomaly": autoencoder_explanation.get("is_zero_day_anomaly") if autoencoder_explanation else False,
                "top_anomalous_features": autoencoder_explanation.get("top_anomalous_features", []) if autoencoder_explanation else [],
                "narrative": autoencoder_explanation.get("narrative") if autoencoder_explanation else "No autoencoder context."
            },
            "scam_typology": {
                "predicted_scam_type": scam_prediction.get("scam_type") if scam_prediction else "unclassified",
                "scam_type_confidence": scam_prediction.get("confidence") if scam_prediction else 0.0,
                "class_probabilities": scam_prediction.get("probabilities", {}) if scam_prediction else {}
            }
        }
