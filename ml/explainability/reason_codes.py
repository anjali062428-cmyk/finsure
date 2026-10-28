"""
FinSure Deterministic Reason Code Engine
Maps multi-modal signals and feature indicators to 10 canonical reason codes.
Provides bilingual descriptions (English and Hindi) with priority ranking.
Reference: Master Prompt v2 Section 7.5 and FinSure SRS v2 Section 3.3.
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Union
import numpy as np
import pandas as pd


class CanonicalReasonCode(str, Enum):
    RC_AMOUNT_ANOMALY = "RC_AMOUNT_ANOMALY"
    RC_RAPID_VELOCITY = "RC_RAPID_VELOCITY"
    RC_NEW_DEVICE = "RC_NEW_DEVICE"
    RC_OFF_HOURS = "RC_OFF_HOURS"
    RC_GRAPH_RISK = "RC_GRAPH_RISK"
    RC_SEQUENCE_ANOMALY = "RC_SEQUENCE_ANOMALY"
    RC_RECONSTRUCTION_OUTLIER = "RC_RECONSTRUCTION_OUTLIER"
    RC_BENEFICIARY_RISK = "RC_BENEFICIARY_RISK"
    RC_GEO_MISMATCH = "RC_GEO_MISMATCH"
    RC_HIGH_VALUE_FIRST_TIME = "RC_HIGH_VALUE_FIRST_TIME"


REASON_CODE_METADATA = {
    CanonicalReasonCode.RC_AMOUNT_ANOMALY: {
        "priority": 1,
        "en": {
            "title": "Unusual Transaction Amount",
            "description": "Transaction amount is significantly higher than your typical spending pattern."
        },
        "hi": {
            "title": "असामान्य लेन-देन राशि",
            "description": "यह लेन-देन राशि आपके सामान्य खर्च पैटर्न से काफी अधिक है।"
        }
    },
    CanonicalReasonCode.RC_RAPID_VELOCITY: {
        "priority": 2,
        "en": {
            "title": "High Frequency of Transfers",
            "description": "Multiple payments attempted in an unusually short time frame."
        },
        "hi": {
            "title": "तीव्र लेन-देन आवृत्ति",
            "description": "बहुत कम समय अंतराल में कई लेन-देन का प्रयास किया गया है।"
        }
    },
    CanonicalReasonCode.RC_NEW_DEVICE: {
        "priority": 3,
        "en": {
            "title": "Unrecognized Device",
            "description": "Payment initiated from a newly observed device or one associated with multiple accounts."
        },
        "hi": {
            "title": "अपरिचित डिवाइस",
            "description": "यह भुगतान एक नए या अज्ञात डिवाइस से शुरू किया गया है।"
        }
    },
    CanonicalReasonCode.RC_OFF_HOURS: {
        "priority": 4,
        "en": {
            "title": "Unusual Time of Payment",
            "description": "High-value payment attempted during late night or early morning hours."
        },
        "hi": {
            "title": "असामान्य समय पर लेन-देन",
            "description": "देर रात या असामान्य समय पर बड़ा लेन-देन करने का प्रयास किया गया।"
        }
    },
    CanonicalReasonCode.RC_GRAPH_RISK: {
        "priority": 5,
        "en": {
            "title": "Suspicious Network Linkage",
            "description": "Device or payment endpoint shows multiple conflicting linkages in the entity network."
        },
        "hi": {
            "title": "संदेहास्पद नेटवर्क संबंध",
            "description": "भुगतान डिवाइस या खाता नेटवर्क में कई संदेहास्पद संबंधों से जुड़ा पाया गया है।"
        }
    },
    CanonicalReasonCode.RC_SEQUENCE_ANOMALY: {
        "priority": 6,
        "en": {
            "title": "Abnormal Sequence Pattern",
            "description": "Transaction sequence shows characteristics of rapid account draining or testing."
        },
        "hi": {
            "title": "असामान्य लेन-देन अनुक्रम",
            "description": "हालिया लेन-देन का क्रम त्वरित निकासी या परीक्षण गतिविधियों जैसा है।"
        }
    },
    CanonicalReasonCode.RC_RECONSTRUCTION_OUTLIER: {
        "priority": 7,
        "en": {
            "title": "Novel Fraud Pattern",
            "description": "Transaction pattern strongly deviates from established baseline behavior (zero-day anomaly)."
        },
        "hi": {
            "title": "असामान्य व्यवहार पैटर्न",
            "description": "यह लेन-देन स्थापित सामान्य बैंकिंग व्यवहार से काफी अलग है।"
        }
    },
    CanonicalReasonCode.RC_BENEFICIARY_RISK: {
        "priority": 8,
        "en": {
            "title": "Unverified Beneficiary",
            "description": "Transfer directed to a newly created or unfamiliar beneficiary VPA."
        },
        "hi": {
            "title": "असत्यापित लाभार्थी",
            "description": "यह भुगतान एक नए या अपरिचित लाभार्थी खाते (VPA) को भेजा जा रहा है।"
        }
    },
    CanonicalReasonCode.RC_GEO_MISMATCH: {
        "priority": 9,
        "en": {
            "title": "Geographic Location Mismatch",
            "description": "Transaction location is inconsistent with recent physical movement or home location."
        },
        "hi": {
            "title": "भौगोलिक स्थान असंगतता",
            "description": "लेन-देन का स्थान हालिया गतिविधि या आपके पंजीकृत स्थान से मेल नहीं खाता।"
        }
    },
    CanonicalReasonCode.RC_HIGH_VALUE_FIRST_TIME: {
        "priority": 10,
        "en": {
            "title": "High-Value First-Time Transfer",
            "description": "Large monetary sum transferred to a recipient for the very first time."
        },
        "hi": {
            "title": "पहली बार बड़ा लेन-देन",
            "description": "पहली बार किसी लाभार्थी को एक बड़ी धनराशि ट्रांसफर की जा रही है।"
        }
    }
}


class ReasonCodeEngine:
    """
    Deterministic rule engine evaluating transaction characteristics against canonical reason codes.
    """
    def __init__(self, frozen_zero_day_threshold: float = 0.3418):
        self.frozen_zero_day_threshold = frozen_zero_day_threshold

    def evaluate_reason_codes(
        self,
        features: Union[Dict[str, Any], pd.Series],
        graph_evidence: Optional[Dict[str, Any]] = None,
        ae_evidence: Optional[Dict[str, Any]] = None,
        seq_evidence: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluates criteria and returns a prioritized list of applicable reason codes.
        """
        f = features.to_dict() if isinstance(features, pd.Series) else dict(features)
        triggered_codes = []

        amount = float(f.get("amount", 0.0))
        amt_zscore = float(f.get("amt_user_zscore", 0.0))
        amt_mean_ratio = float(f.get("amt_to_user_mean", 1.0))
        is_new_payee = bool(f.get("is_new_payee", 0))
        is_new_device = bool(f.get("is_new_device", 0))
        is_night = bool(f.get("is_night", 0))
        txn_1m = float(f.get("txn_count_1m", 0.0))
        txn_1h = float(f.get("txn_count_1h", 0.0))
        burst = bool(f.get("rapid_burst", 0))
        impossible_geo = bool(f.get("impossible_travel", 0))
        out_of_home = bool(f.get("is_out_of_home_city", 0))
        travel_speed = float(f.get("implied_travel_speed_kmh", 0.0))

        # 1. RC_AMOUNT_ANOMALY
        if amt_zscore >= 3.0 or amt_mean_ratio >= 5.0 or (amount > 20000.0 and amt_mean_ratio >= 3.0):
            triggered_codes.append(CanonicalReasonCode.RC_AMOUNT_ANOMALY)

        # 2. RC_RAPID_VELOCITY
        if txn_1m >= 1.0 or txn_1h >= 4.0 or burst:
            triggered_codes.append(CanonicalReasonCode.RC_RAPID_VELOCITY)

        # 3. RC_NEW_DEVICE
        if is_new_device:
            triggered_codes.append(CanonicalReasonCode.RC_NEW_DEVICE)

        # 4. RC_OFF_HOURS
        if is_night and (amount >= 5000.0 or is_new_payee):
            triggered_codes.append(CanonicalReasonCode.RC_OFF_HOURS)

        # 5. RC_GRAPH_RISK
        if graph_evidence:
            topo = graph_evidence.get("topology_evidence", {})
            if topo.get("is_shared_device") or topo.get("is_high_indegree_payee"):
                triggered_codes.append(CanonicalReasonCode.RC_GRAPH_RISK)

        # 6. RC_SEQUENCE_ANOMALY
        if seq_evidence:
            # If top step has high attention and short elapsed time or burst
            ranked = seq_evidence.get("ranked_steps", [])
            if ranked and ranked[0].get("attention_weight", 0.0) >= 0.30 and burst:
                triggered_codes.append(CanonicalReasonCode.RC_SEQUENCE_ANOMALY)

        # 7. RC_RECONSTRUCTION_OUTLIER
        if ae_evidence:
            if ae_evidence.get("is_zero_day_anomaly") or ae_evidence.get("reconstruction_mse", 0.0) > self.frozen_zero_day_threshold:
                triggered_codes.append(CanonicalReasonCode.RC_RECONSTRUCTION_OUTLIER)

        # 8. RC_BENEFICIARY_RISK
        if is_new_payee:
            triggered_codes.append(CanonicalReasonCode.RC_BENEFICIARY_RISK)

        # 9. RC_GEO_MISMATCH
        if impossible_geo or (out_of_home and travel_speed > 250.0):
            triggered_codes.append(CanonicalReasonCode.RC_GEO_MISMATCH)

        # 10. RC_HIGH_VALUE_FIRST_TIME
        if is_new_payee and amount >= 10000.0:
            triggered_codes.append(CanonicalReasonCode.RC_HIGH_VALUE_FIRST_TIME)

        # Sort triggered codes by priority
        unique_codes = list(dict.fromkeys(triggered_codes))
        sorted_codes = sorted(unique_codes, key=lambda c: REASON_CODE_METADATA[c]["priority"])

        result = []
        for code in sorted_codes:
            meta = REASON_CODE_METADATA[code]
            result.append({
                "code": code.value,
                "priority": meta["priority"],
                "en": meta["en"],
                "hi": meta["hi"]
            })

        return result
