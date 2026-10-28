"""
FinSure Real-Time Feature Service
Translates incoming transaction requests and historical context into the validated 36-dimensional
tabular feature vector and 50-step sequence representations.
Enforces the strict Phase 2 guarantee: Training Feature Order == Inference Feature Order.
"""

import math
import logging
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import pandas as pd

from ml.features.pipeline import FEATURE_COLUMNS
from ml.features.geo import get_city_distance_km
from ml.data.deep_datasets import SequenceWindowBuilder

logger = logging.getLogger("finsure.feature_service")


class RealTimeFeatureService:
    """
    Computes single-transaction feature vectors for live inference.
    """
    def __init__(self):
        self.feature_columns = list(FEATURE_COLUMNS)
        self.expected_dim = len(self.feature_columns)  # 36
        assert self.expected_dim == 36, f"Expected 36 features, got {self.expected_dim}"

    @staticmethod
    def _parse_iso_utc(ts_val: Any) -> datetime:
        """Parses any string, datetime, or timestamp into a UTC timezone-aware datetime."""
        if isinstance(ts_val, str):
            try:
                res = datetime.fromisoformat(ts_val.replace("Z", "+00:00"))
            except Exception:
                res = datetime.now(timezone.utc)
        elif isinstance(ts_val, datetime):
            res = ts_val
        else:
            res = datetime.now(timezone.utc)
        if res.tzinfo is None:
            res = res.replace(tzinfo=timezone.utc)
        return res

    def compute_features(
        self,
        transaction: Dict[str, Any],
        profile: Dict[str, Any],
        history: List[Dict[str, Any]],
        familiarity: Dict[str, Any]
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        amt = float(transaction.get("amount", 0.0))
        log_amt = math.log1p(max(0.0, amt))

        # Consistent UTC timezone-aware timestamp parsing
        dt = self._parse_iso_utc(transaction.get("timestamp"))

        hour = dt.hour
        dow = dt.weekday()
        is_weekend = 1 if dow in (5, 6) else 0
        is_night = 1 if hour in (23, 0, 1, 2, 3, 4, 5) else 0

        # Channel encoding
        channel = str(transaction.get("channel", "upi")).lower()
        ch_upi = 1 if channel == "upi" else 0
        ch_card = 1 if channel == "card" else 0
        ch_bank = 1 if channel in ["bank_transfer", "netbanking", "imps", "neft"] else 0

        # User profile & Behavioral baselines
        u_mean = float(profile.get("mean_amount", 1300.0))
        u_median = float(profile.get("median_amount", 210.0))
        u_std = max(1.0, float(profile.get("std_amount", 2500.0)))
        u_limit = max(100.0, float(profile.get("daily_limit", 50000.0)))
        u_city = str(profile.get("home_city", "Mumbai"))
        hist_count = int(profile.get("historical_txn_count", len(history)))

        amt_to_mean = amt / max(1.0, u_mean)
        amt_to_median = amt / max(1.0, u_median)
        amt_zscore = (amt - u_mean) / u_std
        limit_ratio = amt / u_limit

        # History-based relative features (history strictly excludes current transaction)
        prev_amt_max = u_mean
        time_since_prev = 86400.0  # default 1 day
        dist_prev_km = 0.0
        implied_speed = 0.0
        impossible_travel = 0

        curr_city = str(transaction.get("city", u_city))
        is_out_of_home = 1 if curr_city.lower() != u_city.lower() else 0

        # Velocity counters
        txn_1m = 0
        txn_1h = 0
        txn_24h = 0
        amt_1m = 0.0
        amt_1h = 0.0
        amt_24h = 0.0
        distinct_payees = set()
        distinct_devices = set()

        if history:
            prev_tx = history[-1]
            prev_amt_max = max([float(h.get("amount", 0.0)) for h in history] + [u_mean])

            # Calculate time delta from previous transaction
            prev_dt = self._parse_iso_utc(prev_tx.get("timestamp"))

            delta_sec = max(1.0, (dt - prev_dt).total_seconds())
            time_since_prev = delta_sec

            # Calculate geo distance from previous transaction
            prev_city = str(prev_tx.get("city", u_city))
            dist_prev_km = get_city_distance_km(curr_city, prev_city)
            hours_elapsed = delta_sec / 3600.0
            if hours_elapsed > 0:
                implied_speed = dist_prev_km / hours_elapsed
            if implied_speed > 800.0 and dist_prev_km > 50.0:
                impossible_travel = 1

            # Compute rolling velocity from history window
            for h in history:
                h_dt = self._parse_iso_utc(h.get("timestamp"))

                diff_s = (dt - h_dt).total_seconds()
                h_amt = float(h.get("amount", 0.0))
                p_id = str(h.get("payee_id", ""))
                d_id = str(h.get("device_id", ""))

                if 0 <= diff_s <= 60:
                    txn_1m += 1
                    amt_1m += h_amt
                if 0 <= diff_s <= 3600:
                    txn_1h += 1
                    amt_1h += h_amt
                if 0 <= diff_s <= 86400:
                    txn_24h += 1
                    amt_24h += h_amt
                    if p_id:
                        distinct_payees.add(p_id)
                    if d_id:
                        distinct_devices.add(d_id)

        amt_to_max = amt / max(1.0, prev_amt_max)
        log_time_prev = math.log1p(time_since_prev)

        # Familiarity
        is_new_payee = int(familiarity.get("is_new_payee", 1))
        is_new_device = int(familiarity.get("is_new_device", 1))
        payee_fam_cnt = int(familiarity.get("payee_familiarity_count", 0))
        dev_fam_cnt = int(familiarity.get("device_familiarity_count", 0))

        # Risk interactions
        new_dev_night = 1 if (is_new_device == 1 and is_night == 1) else 0
        new_payee_large = 1 if (is_new_payee == 1 and amt >= 10000.0) else 0
        rapid_burst = 1 if (txn_1m >= 1 or txn_1h >= 4) else 0

        # Construct feature dictionary adhering strictly to FEATURE_COLUMNS
        feat_dict = {
            "amount": float(amt),
            "log_amount": float(log_amt),
            "hour": float(hour),
            "dayofweek": float(dow),
            "is_weekend": float(is_weekend),
            "is_night": float(is_night),
            "channel_upi": float(ch_upi),
            "channel_card": float(ch_card),
            "channel_bank_transfer": float(ch_bank),
            "hist_user_txn_count": float(hist_count),
            "amt_to_user_mean": float(amt_to_mean),
            "amt_to_user_median": float(amt_to_median),
            "amt_user_zscore": float(amt_zscore),
            "amt_to_user_max": float(amt_to_max),
            "time_since_prev_txn_sec": float(time_since_prev),
            "log_time_since_prev_sec": float(log_time_prev),
            "user_daily_limit_ratio": float(limit_ratio),
            "payee_familiarity_count": float(payee_fam_cnt),
            "is_new_payee": float(is_new_payee),
            "device_familiarity_count": float(dev_fam_cnt),
            "is_new_device": float(is_new_device),
            "txn_count_1m": float(txn_1m),
            "txn_count_1h": float(txn_1h),
            "txn_count_24h": float(txn_24h),
            "amt_sum_1m": float(amt_1m),
            "amt_sum_1h": float(amt_1h),
            "amt_sum_24h": float(amt_24h),
            "distinct_payees_24h": float(len(distinct_payees)),
            "distinct_devices_24h": float(len(distinct_devices)),
            "is_out_of_home_city": float(is_out_of_home),
            "dist_from_prev_txn_km": float(dist_prev_km),
            "implied_travel_speed_kmh": float(implied_speed),
            "impossible_travel": float(impossible_travel),
            "is_new_device_and_night": float(new_dev_night),
            "is_new_payee_and_large": float(new_payee_large),
            "rapid_burst": float(rapid_burst)
        }

        # Build feature vector with strict ordering check
        features_vec = np.zeros(self.expected_dim, dtype=np.float32)
        for idx, col in enumerate(self.feature_columns):
            val = feat_dict.get(col, 0.0)
            if math.isnan(val) or math.isinf(val):
                val = 0.0
            features_vec[idx] = float(val)

        return features_vec, feat_dict

    def build_sequence_tensors(
        self,
        history: List[Dict[str, Any]],
        max_seq_len: int = 50
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Builds sequence array (1, 50, 12) and boolean mask (1, 50) for the Sequence Model.
        Target transaction is strictly excluded.
        If history has fewer than 50 steps, pads with zeros and marks mask False.
        """
        seq_array = np.zeros((1, max_seq_len, 12), dtype=np.float32)
        mask_array = np.zeros((1, max_seq_len), dtype=bool)

        if not history:
            return seq_array, mask_array

        recent_history = history[-max_seq_len:]
        num_valid = len(recent_history)

        for step_idx, h_item in enumerate(recent_history):
            # Extract step features
            amt = float(h_item.get("amount", 0.0))
            log_amt = math.log1p(max(0.0, amt)) / 10.0

            dt = self._parse_iso_utc(h_item.get("timestamp"))

            hour_norm = float(dt.hour) / 24.0
            dow_norm = float(dt.weekday()) / 7.0
            is_night = 1.0 if dt.hour in (23, 0, 1, 2, 3, 4, 5) else 0.0
            is_weekend = 1.0 if dt.weekday() in (5, 6) else 0.0

            step_feats = np.array([
                log_amt,
                hour_norm,
                dow_norm,
                is_night,
                is_weekend,
                1.0,   # channel indicator
                0.0,   # time delta norm
                0.0,   # limit ratio
                1.0,   # familiar payee
                1.0,   # familiar device
                0.0,   # out of home city
                0.0    # burst flag
            ], dtype=np.float32)

            seq_array[0, step_idx] = step_feats
            mask_array[0, step_idx] = True

        return seq_array, mask_array
