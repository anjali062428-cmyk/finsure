"""
FinSure Shared Feature Engineering Pipeline
Computes leakage-safe transaction, behavioral, velocity, geo, and risk interaction features.
Guarantees zero future leakage: rolling features strictly exclude the current transaction.
Shared code path for offline training and future online inference.
Reference: Master Prompt v2 Section 5.2 and FinSure SRS v2 Section 3.3 (FR-ML-01).
"""

import os
import json
import math
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd

from ml.features.geo import get_city_distance_km


FEATURE_COLUMNS = [
    # A. Transaction features (9)
    "amount",
    "log_amount",
    "hour",
    "dayofweek",
    "is_weekend",
    "is_night",
    "channel_upi",
    "channel_card",
    "channel_bank_transfer",
    
    # B. Behavioral features (10)
    "hist_user_txn_count",
    "amt_to_user_mean",
    "amt_to_user_median",
    "amt_user_zscore",
    "amt_to_user_max",
    "time_since_prev_txn_sec",
    "log_time_since_prev_sec",
    "user_daily_limit_ratio",
    "payee_familiarity_count",
    "is_new_payee",
    
    # C. Device familiarity (2)
    "device_familiarity_count",
    "is_new_device",
    
    # D. Velocity features (8)
    "txn_count_1m",
    "txn_count_1h",
    "txn_count_24h",
    "amt_sum_1m",
    "amt_sum_1h",
    "amt_sum_24h",
    "distinct_payees_24h",
    "distinct_devices_24h",
    
    # E. Geo & Movement features (4)
    "is_out_of_home_city",
    "dist_from_prev_txn_km",
    "implied_travel_speed_kmh",
    "impossible_travel",
    
    # F. Risk / Interaction features (3)
    "is_new_device_and_night",
    "is_new_payee_and_large",
    "rapid_burst"
]


class FeaturePipeline:
    def __init__(self, user_profiles: Optional[Dict[str, Dict[str, Any]]] = None):
        """
        Initializes the feature pipeline.
        user_profiles: optional pre-loaded dictionary mapping user_id -> profile dictionary.
        """
        self.user_profiles = user_profiles or {}
        self.feature_names = list(FEATURE_COLUMNS)
        self.is_fitted = False
        
        # Training priors (for imputation of first-seen users without history)
        self.global_priors = {
            "mean_amount": 1300.0,
            "median_amount": 210.0,
            "std_amount": 2500.0,
            "daily_limit": 50000.0
        }

    def load_entity_profiles(self, users_df: pd.DataFrame):
        """Builds in-memory dictionary of user demographic baseline parameters."""
        profiles = {}
        for _, row in users_df.iterrows():
            profiles[row["user_id"]] = {
                "city": row.get("city", "Mumbai"),
                "daily_limit": float(row.get("daily_limit", 50000.0)),
                "income_band": row.get("income_band", "mid"),
                "mean_log_amt": float(row.get("mean_log_amt", 5.0)),
                "sigma_log_amt": float(row.get("sigma_log_amt", 0.65))
            }
        self.user_profiles = profiles

    def fit(self, df_train: pd.DataFrame):
        """Computes global training priors from the training split."""
        if not df_train.empty:
            self.global_priors["mean_amount"] = float(df_train["amount"].mean())
            self.global_priors["median_amount"] = float(df_train["amount"].median())
            self.global_priors["std_amount"] = float(df_train["amount"].std(ddof=1) if len(df_train) > 1 else 2500.0)
        self.is_fitted = True
        return self

    def transform(self, df_txns: pd.DataFrame) -> pd.DataFrame:
        """
        Transforms an input transaction dataframe into feature matrix.
        Enforces strict time order: rolling state is accumulated strictly forward in time.
        Transaction i is NEVER included in its own historical or velocity features.
        """
        df = df_txns.copy()
        df["created_at_dt"] = pd.to_datetime(df["created_at"], format="ISO8601")
        
        # Sort chronologically to preserve physical causality
        original_indices = df.index
        df = df.sort_values("created_at_dt").reset_index(drop=True)
        
        n_rows = len(df)
        feature_records: List[Dict[str, float]] = []
        
        # State tracking per user: user_id -> state dict
        # In online serving, this state is maintained in Redis; here it accumulates in-memory.
        user_state: Dict[str, Dict[str, Any]] = {}
        
        for idx in range(n_rows):
            row = df.iloc[idx]
            u_id = row["user_id"]
            amt = float(row["amount"])
            t_curr = row["created_at_dt"]
            t_curr_sec = t_curr.timestamp()
            payee = row["payee_id"]
            dev = row["device_id"]
            geo = row["geo"]
            ch = row["channel"]
            
            # Fetch user profile base
            prof = self.user_profiles.get(u_id, {
                "city": geo,
                "daily_limit": self.global_priors["daily_limit"],
                "income_band": "mid"
            })
            
            home_city = prof.get("city", geo)
            daily_limit = float(prof.get("daily_limit", self.global_priors["daily_limit"]))
            
            # Retrieve or initialize user state
            ustate = user_state.get(u_id)
            if ustate is None:
                ustate = {
                    "txn_history": [],  # list of (timestamp_sec, amount, payee, device, geo)
                    "payee_counts": {},
                    "device_counts": {},
                    "amounts": []
                }
                user_state[u_id] = ustate
                
            history = ustate["txn_history"]
            prior_amounts = ustate["amounts"]
            payee_counts = ustate["payee_counts"]
            device_counts = ustate["device_counts"]
            
            # === A. Transaction Features ===
            hour = t_curr.hour
            dayofweek = t_curr.dayofweek
            is_weekend = 1.0 if dayofweek in (5, 6) else 0.0
            is_night = 1.0 if 1 <= hour <= 5 else 0.0
            channel_upi = 1.0 if ch == "UPI" else 0.0
            channel_card = 1.0 if ch == "card" else 0.0
            channel_bank = 1.0 if ch == "bank_transfer" else 0.0
            log_amt = float(np.log1p(amt))
            
            # === B. Behavioral Features (from prior transactions only) ===
            hist_count = len(prior_amounts)
            if hist_count > 0:
                hist_mean = float(np.mean(prior_amounts))
                hist_median = float(np.median(prior_amounts))
                hist_std = float(np.std(prior_amounts, ddof=1)) if hist_count > 1 else (hist_mean * 0.5)
                hist_max = float(np.max(prior_amounts))
                amt_to_mean = amt / (hist_mean + 1e-4)
                amt_to_median = amt / (hist_median + 1e-4)
                amt_zscore = (amt - hist_mean) / (hist_std + 1e-4)
                amt_to_max = amt / (hist_max + 1e-4)
                
                prev_txn = history[-1]
                time_since_prev = max(0.0, t_curr_sec - prev_txn[0])
                prev_geo = prev_txn[4]
            else:
                # Cold start: fallback to profile / global prior baseline
                hist_mean = self.global_priors["mean_amount"]
                hist_median = self.global_priors["median_amount"]
                hist_std = self.global_priors["std_amount"]
                amt_to_mean = amt / (hist_mean + 1e-4)
                amt_to_median = amt / (hist_median + 1e-4)
                amt_zscore = 0.0
                amt_to_max = 1.0
                time_since_prev = 86400.0 * 7  # default 7 days for cold start
                prev_geo = home_city
                
            log_time_since_prev = float(np.log1p(time_since_prev))
            daily_limit_ratio = amt / (daily_limit + 1e-4)
            
            payee_fam = float(payee_counts.get(payee, 0))
            is_new_p = 1.0 if payee_fam == 0 else 0.0
            
            dev_fam = float(device_counts.get(dev, 0))
            is_new_d = 1.0 if dev_fam == 0 else 0.0
            
            # === C. Velocity Features (1m, 1h, 24h windows strictly before t_curr) ===
            t_1m_ago = t_curr_sec - 60.0
            t_1h_ago = t_curr_sec - 3600.0
            t_24h_ago = t_curr_sec - 86400.0
            
            cnt_1m = 0
            cnt_1h = 0
            cnt_24h = 0
            sum_1m = 0.0
            sum_1h = 0.0
            sum_24h = 0.0
            payees_24h = set()
            devices_24h = set()
            
            # Walk backwards from most recent historical transaction
            for past_t, past_amt, past_p, past_d, _ in reversed(history):
                if past_t < t_24h_ago:
                    break
                cnt_24h += 1
                sum_24h += past_amt
                payees_24h.add(past_p)
                devices_24h.add(past_d)
                
                if past_t >= t_1h_ago:
                    cnt_1h += 1
                    sum_1h += past_amt
                    
                if past_t >= t_1m_ago:
                    cnt_1m += 1
                    sum_1m += past_amt
                    
            distinct_payees_24h = float(len(payees_24h))
            distinct_devices_24h = float(len(devices_24h))
            
            # === D. Geo & Movement Features ===
            is_out_city = 1.0 if geo != home_city else 0.0
            dist_km = get_city_distance_km(prev_geo, geo)
            time_hours = max(0.001, time_since_prev / 3600.0)
            travel_speed = dist_km / time_hours
            impossible_travel = 1.0 if (travel_speed > 800.0 and dist_km > 100.0) else 0.0
            
            # === E. Risk & Interaction Features ===
            is_new_dev_night = 1.0 if (is_new_d > 0 and is_night > 0) else 0.0
            is_new_payee_large = 1.0 if (is_new_p > 0 and amt_to_mean > 2.5) else 0.0
            rapid_burst = 1.0 if (cnt_1m >= 2 or cnt_1h >= 5) else 0.0
            
            feat_dict = {
                "amount": amt,
                "log_amount": log_amt,
                "hour": float(hour),
                "dayofweek": float(dayofweek),
                "is_weekend": is_weekend,
                "is_night": is_night,
                "channel_upi": channel_upi,
                "channel_card": channel_card,
                "channel_bank_transfer": channel_bank,
                
                "hist_user_txn_count": float(hist_count),
                "amt_to_user_mean": round(amt_to_mean, 4),
                "amt_to_user_median": round(amt_to_median, 4),
                "amt_user_zscore": round(amt_zscore, 4),
                "amt_to_user_max": round(amt_to_max, 4),
                "time_since_prev_txn_sec": round(time_since_prev, 1),
                "log_time_since_prev_sec": round(log_time_since_prev, 4),
                "user_daily_limit_ratio": round(daily_limit_ratio, 4),
                "payee_familiarity_count": payee_fam,
                "is_new_payee": is_new_p,
                
                "device_familiarity_count": dev_fam,
                "is_new_device": is_new_d,
                
                "txn_count_1m": float(cnt_1m),
                "txn_count_1h": float(cnt_1h),
                "txn_count_24h": float(cnt_24h),
                "amt_sum_1m": round(sum_1m, 2),
                "amt_sum_1h": round(sum_1h, 2),
                "amt_sum_24h": round(sum_24h, 2),
                "distinct_payees_24h": distinct_payees_24h,
                "distinct_devices_24h": distinct_devices_24h,
                
                "is_out_of_home_city": is_out_city,
                "dist_from_prev_txn_km": dist_km,
                "implied_travel_speed_kmh": round(travel_speed, 2),
                "impossible_travel": impossible_travel,
                
                "is_new_device_and_night": is_new_dev_night,
                "is_new_payee_and_large": is_new_payee_large,
                "rapid_burst": rapid_burst
            }
            feature_records.append(feat_dict)
            
            # === UPDATE STATE (AFTER feature extraction) ===
            # The current transaction enters history only for subsequent transactions
            history.append((t_curr_sec, amt, payee, dev, geo))
            prior_amounts.append(amt)
            payee_counts[payee] = payee_counts.get(payee, 0) + 1
            device_counts[dev] = device_counts.get(dev, 0) + 1

        features_df = pd.DataFrame(feature_records, index=df.index)
        
        # Attach labels and metadata
        features_df["txn_id"] = df["txn_id"]
        features_df["created_at"] = df["created_at"]
        features_df["is_fraud"] = df["is_fraud"]
        features_df["scam_type"] = df.get("scam_type", "none")
        
        # Reorder back to original index order if needed
        return features_df
