"""
FinSure Seeded Synthetic UPI Data Generator
Implements full entity schemas, realistic Indian transaction dynamics, hard negatives,
attack event chains with hash-linking, and configurable realism knobs (noise, concept drift).
Reference: Master Prompt v2 Section 5.1.1 and FinSure SRS v2 Section 6.1/6.5.
"""

import os
import yaml
import json
import random
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd


def compute_event_hash(prev_hash: str, details_json: str, timestamp_str: str) -> str:
    """Computes SHA-256 hash chaining for incident event stream."""
    payload = f"{prev_hash}|{timestamp_str}|{details_json}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def verify_incident_event_chain(events: List[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
    """
    Verifies the cryptographic integrity of an append-only incident event log.
    Returns (True, None) if untampered, or (False, failure_reason) if any event or hash was modified.
    """
    if not events:
        return True, None
    
    sorted_events = sorted(events, key=lambda x: x["seq_no"])
    prev_h = "0000000000000000000000000000000000000000000000000000000000000000"
    
    for ev in sorted_events:
        if ev["prev_hash"] != prev_h:
            return False, f"Broken chain link at seq_no {ev['seq_no']}: prev_hash does not match preceding event hash."
        
        expected_hash = compute_event_hash(prev_h, ev["details_json"], ev["event_time"])
        if ev["event_hash"] != expected_hash:
            return False, f"Tampered event content detected at seq_no {ev['seq_no']}: hash mismatch."
        
        prev_h = ev["event_hash"]
        
    return True, None


class FinSureSyntheticGenerator:
    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            config_path = os.path.join(os.path.dirname(__file__), "generator_config.yaml")
        
        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)
            
        self.seed = self.config.get("generator", {}).get("seed", 42)
        random.seed(self.seed)
        np.random.seed(self.seed)
        
        sim_cfg = self.config.get("simulation", {})
        self.start_date = datetime.fromisoformat(sim_cfg.get("start_date", "2026-01-01T00:00:00"))
        self.duration_days = sim_cfg.get("duration_days", 90)
        self.end_date = self.start_date + timedelta(days=self.duration_days)
        self.num_users = sim_cfg.get("num_users", 1000)
        self.target_fraud_rate = sim_cfg.get("target_fraud_rate", 0.012)
        
        self.knobs = self.config.get("realism_knobs", {})
        self.label_noise = self.knobs.get("label_noise_rate", 0.015)
        self.hard_negative_rate = self.knobs.get("hard_negatives_rate", 0.05)
        self.drift_window_days = self.knobs.get("concept_drift_window_days", 15)
        self.drift_start_date = self.end_date - timedelta(days=self.drift_window_days)
        
        # State stores
        self.users: List[Dict[str, Any]] = []
        self.devices: List[Dict[str, Any]] = []
        self.payees: List[Dict[str, Any]] = []
        self.transactions: List[Dict[str, Any]] = []
        self.incident_events: List[Dict[str, Any]] = []
        self.labels: List[Dict[str, Any]] = []
        
        # Seeded demo scenarios state
        self.demo_ato_case_id = "FS-2026-000481"
        self.mule_ring_device_id = "DEV_MULE_RING_01"

    def _generate_indian_name(self) -> Tuple[str, str, str]:
        first_names = [
            "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Muhammad", "Sai", "Ayaan", "Krishna",
            "Ananya", "Diya", "Isha", "Riya", "Aadhya", "Pooja", "Priya", "Kavya", "Sneha", "Neha",
            "Rohan", "Vikram", "Rahul", "Amit", "Rajesh", "Suresh", "Sunil", "Anjali", "Meera", "Swati"
        ]
        last_names = [
            "Sharma", "Verma", "Patel", "Gupta", "Singh", "Kumar", "Mishra", "Joshi", "Iyer", "Nair",
            "Reddy", "Rao", "Deshmukh", "Kulkarni", "Mehta", "Shah", "Chatterjee", "Banerjee", "Khan", "Ahmed"
        ]
        first = random.choice(first_names)
        last = random.choice(last_names)
        email = f"{first.lower()}.{last.lower()}{random.randint(10, 999)}@gmail.com"
        return f"{first} {last}", email, f"+91{random.randint(6000000000, 9999999999)}"

    def generate_users(self):
        """Generates realistic user profiles with age, city, income band, and base spending parameters."""
        cities = self.config["user_profiles"]["cities"]
        city_names = [c["name"] for c in cities]
        city_weights = [c["weight"] for c in cities]
        
        income_bands = ["low", "mid", "high"]
        income_weights = [
            self.config["user_profiles"]["income_bands"]["low"]["weight"],
            self.config["user_profiles"]["income_bands"]["mid"]["weight"],
            self.config["user_profiles"]["income_bands"]["high"]["weight"]
        ]
        
        for u_idx in range(1, self.num_users + 1):
            user_id = f"USR_{u_idx:06d}"
            name, email, phone = self._generate_indian_name()
            city = random.choices(city_names, weights=city_weights)[0]
            income = random.choices(income_bands, weights=income_weights)[0]
            band_info = self.config["user_profiles"]["income_bands"][income]
            
            # User amount distribution parameters (lognormal)
            mean_log_amt = np.log(band_info["min_amt"] * 5)
            sigma_log_amt = 0.65
            daily_limit = band_info["daily_limit"]
            
            # Active hours distribution (most active 08:00 - 23:00)
            morning_person = random.random() < 0.4
            active_start = 7 if morning_person else 9
            active_end = 22 if morning_person else 23
            
            created_at = self.start_date - timedelta(days=random.randint(30, 365))
            
            user_rec = {
                "user_id": user_id,
                "name": name,
                "email": email,
                "phone": phone,
                "city": city,
                "income_band": income,
                "daily_limit": daily_limit,
                "mean_log_amt": mean_log_amt,
                "sigma_log_amt": sigma_log_amt,
                "active_start": active_start,
                "active_end": active_end,
                "email_verified": True,
                "phone_verified": True,
                "status": "active",
                "created_at": created_at.isoformat()
            }
            self.users.append(user_rec)

    def generate_devices_and_payees(self):
        """Generates registered mobile/desktop devices and initial trusted payees per user."""
        device_models = [
            ("Samsung", "Galaxy S23", "Android"),
            ("Apple", "iPhone 14", "iOS"),
            ("OnePlus", "OnePlus 11", "Android"),
            ("Xiaomi", "Redmi Note 12", "Android"),
            ("Vivo", "Vivo V27", "Android"),
            ("Apple", "MacBook Pro", "macOS"),
            ("Dell", "XPS 15", "Windows")
        ]
        
        merchant_names = [
            ("Swiggy", "food_delivery"), ("Zomato", "food_delivery"),
            ("Amazon India", "ecommerce"), ("Flipkart", "ecommerce"),
            ("Blinkit", "groceries"), ("Zepto", "groceries"),
            ("Uber India", "transport"), ("Ola Cabs", "transport"),
            ("Airtel Postpaid", "utilities"), ("Jio Recharge", "utilities"),
            ("Bescom Power", "utilities"), ("Tata Power", "utilities"),
            ("Apollo Pharmacy", "health"), ("Cult.fit", "fitness")
        ]
        
        # 1. Global Merchants
        global_merchants = []
        for m_name, m_cat in merchant_names:
            vpa = f"{m_name.lower().replace(' ', '')}@okaxis"
            m_id = f"PAYEE_M_{len(global_merchants)+1:04d}"
            global_merchants.append({
                "payee_id": m_id,
                "user_id": "GLOBAL",
                "vpa_or_account": vpa,
                "payee_name": m_name,
                "payee_type": "merchant",
                "category": m_cat,
                "first_seen": self.start_date.isoformat(),
                "trusted": True,
                "blocklisted": False
            })
        self.payees.extend(global_merchants)
        
        # 2. Per-user personal devices and personal payees
        for user in self.users:
            u_id = user["user_id"]
            # Primary device
            brand, model, os_name = random.choice(device_models)
            dev_id = f"DEV_{u_id}_1"
            fp = hashlib.md5(f"{u_id}_{brand}_{model}".encode()).hexdigest()
            self.devices.append({
                "device_id": dev_id,
                "user_id": u_id,
                "fingerprint": fp,
                "brand": brand,
                "model": model,
                "os": os_name,
                "first_seen": user["created_at"],
                "trusted": True
            })
            
            # Secondary device (for 35% of users)
            if random.random() < 0.35:
                brand2, model2, os2 = random.choice(device_models)
                dev_id2 = f"DEV_{u_id}_2"
                fp2 = hashlib.md5(f"{u_id}_{brand2}_{model2}_secondary".encode()).hexdigest()
                self.devices.append({
                    "device_id": dev_id2,
                    "user_id": u_id,
                    "fingerprint": fp2,
                    "brand": brand2,
                    "model": model2,
                    "os": os2,
                    "first_seen": user["created_at"],
                    "trusted": True
                })
                
            # Personal payees (friends & family)
            num_personal_payees = random.randint(2, 6)
            for p_idx in range(num_personal_payees):
                p_name, _, _ = self._generate_indian_name()
                vpa = f"{p_name.lower().replace(' ', '')}{random.randint(10,99)}@okhdfcbank"
                self.payees.append({
                    "payee_id": f"PAYEE_{u_id}_{p_idx+1}",
                    "user_id": u_id,
                    "vpa_or_account": vpa,
                    "payee_name": p_name,
                    "payee_type": "friend_family",
                    "category": "peer_to_peer",
                    "first_seen": user["created_at"],
                    "trusted": True,
                    "blocklisted": False
                })

    def generate_legitimate_transactions(self) -> List[Dict[str, Any]]:
        """Generates legitimate baseline transactions incorporating weekly rhythm, spikes, and hard negatives."""
        legit_txns = []
        user_devices = {}
        for d in self.devices:
            user_devices.setdefault(d["user_id"], []).append(d["device_id"])
            
        user_payees = {}
        for p in self.payees:
            user_payees.setdefault(p["user_id"], []).append(p)
            
        global_merchants = [p for p in self.payees if p["user_id"] == "GLOBAL"]
        
        # Determine average transactions per user over duration (approx 40-70 txns per user)
        for user in self.users:
            u_id = user["user_id"]
            devs = user_devices.get(u_id, [])
            if not devs:
                continue
            primary_dev = devs[0]
            
            p_list = user_payees.get(u_id, [])
            num_txns = random.randint(30, 80)
            
            # Generate random timestamps across the duration
            txn_days = sorted([random.uniform(0, self.duration_days) for _ in range(num_txns)])
            
            for day_offset in txn_days:
                current_time = self.start_date + timedelta(days=day_offset)
                
                # Active hours check with diurnal curve
                hour = random.randint(user["active_start"], user["active_end"]) if random.random() < 0.95 else random.randint(0, 6)
                minute = random.randint(0, 59)
                second = random.randint(0, 59)
                current_time = current_time.replace(hour=hour, minute=minute, second=second)
                
                # Base amount from lognormal
                base_amt = float(np.random.lognormal(user["mean_log_amt"], user["sigma_log_amt"]))
                base_amt = max(10.0, min(base_amt, user["daily_limit"] * 0.7))
                
                # Salary spike (1st or 30th/31st of month)
                if current_time.day in [1, 2, 3, 28, 29, 30, 31] and random.random() < 0.15:
                    base_amt *= random.uniform(1.8, 3.2)
                    
                # Hard Negative Injections (~5% of transactions)
                is_hard_negative = random.random() < self.hard_negative_rate
                hard_neg_type = None
                chosen_device = primary_dev
                chosen_ip = f"103.{random.randint(10,250)}.{random.randint(1,250)}.{random.randint(1,250)}"
                chosen_geo = user["city"]
                
                if is_hard_negative:
                    hard_scenario = random.choice(["night_travel", "phone_upgrade", "large_rent", "first_merchant"])
                    if hard_scenario == "night_travel":
                        hard_neg_type = "legitimate_travel_night"
                        current_time = current_time.replace(hour=random.choice([1, 2, 3, 4]))
                        chosen_geo = random.choice(["Goa", "Kolkata", "Chandigarh", "Shimla"])
                        chosen_ip = f"49.{random.randint(10,250)}.{random.randint(1,250)}.{random.randint(1,250)}"
                    elif hard_scenario == "phone_upgrade":
                        hard_neg_type = "legitimate_new_device"
                        chosen_device = f"DEV_{u_id}_UPGRADE_{random.randint(100,999)}"
                    elif hard_scenario == "large_rent":
                        hard_neg_type = "legitimate_large_payment"
                        base_amt = user["daily_limit"] * random.uniform(0.75, 0.95)
                    elif hard_scenario == "first_merchant":
                        hard_neg_type = "legitimate_new_payee"
                
                # Payee selection
                if is_hard_negative and hard_neg_type == "legitimate_new_payee":
                    target_payee = f"new_shop_{random.randint(1000,9999)}@icici"
                elif random.random() < 0.65 and p_list:
                    target_payee = random.choice(p_list)["vpa_or_account"]
                else:
                    target_payee = random.choice(global_merchants)["vpa_or_account"]
                
                txn_id = f"TXN_{u_id}_{len(legit_txns)+1:06d}"
                channel = random.choices(["UPI", "card", "bank_transfer"], weights=[0.82, 0.12, 0.06])[0]
                
                legit_txns.append({
                    "txn_id": txn_id,
                    "user_id": u_id,
                    "payee_id": target_payee,
                    "amount": round(base_amt, 2),
                    "channel": channel,
                    "device_id": chosen_device,
                    "ip": chosen_ip,
                    "geo": chosen_geo,
                    "status": "approved",
                    "created_at": current_time.isoformat(),
                    "is_fraud": 0,
                    "scam_type": "none",
                    "fraud_ring_id": None,
                    "is_hard_negative": is_hard_negative,
                    "hard_negative_type": hard_neg_type
                })
        return legit_txns

    def inject_fraud_scenarios(self, base_txns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Injects five realistic fraud archetypes with event logs, hash chains, and realism knobs."""
        all_txns = list(base_txns)
        target_fraud_count = int(len(base_txns) * self.target_fraud_rate)
        
        # 1. Signature Demo Scenario: Account Takeover (ATO) FS-2026-000481
        ato_user = self.users[0]
        ato_time = self.start_date + timedelta(days=45, hours=2, minutes=58)
        ato_txn_id = "TXN_ATO_DEMO_000481"
        ato_case_id = self.demo_ato_case_id
        
        chain_events = [
            ("login", ato_time, {"method": "password_plus_otp", "ip": "185.220.101.5", "geo": "Lagos"}),
            ("device_registered", ato_time + timedelta(minutes=1), {"device_id": "DEV_ROGUE_ATO_99", "brand": "Unknown", "os": "Linux"}),
            ("payee_added", ato_time + timedelta(minutes=4), {"vpa": "fastmule88@ybl", "name": "Quick Cashier"}),
            ("limit_changed", ato_time + timedelta(minutes=11), {"old_limit": 50000, "new_limit": 100000}),
            ("txn_attempt", ato_time + timedelta(minutes=14), {"amount": 85000.0, "payee": "fastmule88@ybl", "txn_id": ato_txn_id})
        ]
        
        prev_h = "0000000000000000000000000000000000000000000000000000000000000000"
        for seq, (ev_type, ev_time, details) in enumerate(chain_events, start=1):
            det_str = json.dumps(details, sort_keys=True)
            ev_h = compute_event_hash(prev_h, det_str, ev_time.isoformat())
            self.incident_events.append({
                "case_id": ato_case_id,
                "txn_id": ato_txn_id,
                "user_id": ato_user["user_id"],
                "seq_no": seq,
                "event_type": ev_type,
                "event_time": ev_time.isoformat(),
                "details_json": det_str,
                "risk_attribution": 0.0 if seq < 3 else (25.0 if seq == 3 else 48.0),
                "prev_hash": prev_h,
                "event_hash": ev_h
            })
            prev_h = ev_h
            
        all_txns.append({
            "txn_id": ato_txn_id,
            "user_id": ato_user["user_id"],
            "payee_id": "fastmule88@ybl",
            "amount": 85000.0,
            "channel": "UPI",
            "device_id": "DEV_ROGUE_ATO_99",
            "ip": "185.220.101.5",
            "geo": "Lagos",
            "status": "blocked",
            "created_at": (ato_time + timedelta(minutes=14)).isoformat(),
            "is_fraud": 1,
            "scam_type": "account_takeover",
            "fraud_ring_id": None,
            "is_hard_negative": False,
            "hard_negative_type": None
        })
        
        # 1b. Additional ATO waves across users (total ~150 ATO instances)
        num_additional_ato = int(target_fraud_count * 0.28)
        candidate_ato_users = random.sample(self.users[1:], min(num_additional_ato, len(self.users)-1))
        for idx, u in enumerate(candidate_ato_users):
            day_offset = random.uniform(2, self.duration_days - 2)
            hour = random.choice([1, 2, 3, 4, 23]) if random.random() < 0.75 else random.randint(8, 20)
            t_time = self.start_date + timedelta(days=day_offset, hours=hour, minutes=random.randint(0, 59))
            # Camouflaged amount for 20% of ATOs (within normal spending range)
            is_camouflaged = random.random() < 0.20
            amt = float(np.random.lognormal(u["mean_log_amt"], u["sigma_log_amt"])) if is_camouflaged else round(random.uniform(35000, 95000), 2)
            
            all_txns.append({
                "txn_id": f"TXN_ATO_GEN_{idx+1:04d}",
                "user_id": u["user_id"],
                "payee_id": f"scam_drop_{random.randint(100,999)}@paytm",
                "amount": round(amt, 2),
                "channel": "UPI",
                "device_id": f"DEV_UNKNOWN_{random.randint(1000,9999)}",
                "ip": f"185.220.{random.randint(1,250)}.{random.randint(1,250)}",
                "geo": random.choice(["Lagos", "Bucharest", "Unknown_VPN"]),
                "status": "blocked" if amt > 50000 else "challenged",
                "created_at": t_time.isoformat(),
                "is_fraud": 1,
                "scam_type": "account_takeover",
                "fraud_ring_id": None,
                "is_hard_negative": False,
                "hard_negative_type": None
            })
            
        # 2. Mule Rings (5 rings, shared devices/payees, total ~150 transactions)
        num_rings = self.config["simulation"].get("num_mule_rings", 5)
        for ring_idx in range(num_rings):
            ring_id = f"RING_MULE_{ring_idx+1:02d}"
            ring_device = f"DEV_SHARED_MULE_{ring_idx+1:02d}"
            ring_payee = f"mule_hub_{ring_idx+1:02d}@hdfcbank"
            ring_ip = f"194.26.{20+ring_idx}.{random.randint(10,200)}"
            victims = random.sample(self.users, 6)
            for v_idx, vic in enumerate(victims):
                m_day = random.uniform(5, self.duration_days - 5)
                m_time = self.start_date + timedelta(days=m_day, hours=random.randint(10, 19), minutes=v_idx * 5)
                all_txns.append({
                    "txn_id": f"TXN_RING_{ring_idx+1}_{v_idx+1}",
                    "user_id": vic["user_id"],
                    "payee_id": ring_payee,
                    "amount": round(random.uniform(40000, 80000), 2),
                    "channel": "UPI",
                    "device_id": ring_device,
                    "ip": ring_ip,
                    "geo": "Noida",
                    "status": "blocked",
                    "created_at": m_time.isoformat(),
                    "is_fraud": 1,
                    "scam_type": "mule_account",
                    "fraud_ring_id": ring_id,
                    "is_hard_negative": False,
                    "hard_negative_type": None
                })
                
        # 3. Collect-Request Scams (total ~130 transactions)
        num_collect = int(target_fraud_count * 0.20)
        collect_victims = random.sample(self.users, min(num_collect, len(self.users)))
        for c_idx, vic in enumerate(collect_victims):
            c_day = random.uniform(3, self.duration_days - 3)
            c_time = self.start_date + timedelta(days=c_day, hours=random.randint(10, 20), minutes=random.randint(0, 59))
            all_txns.append({
                "txn_id": f"TXN_COLLECT_GEN_{c_idx+1:04d}",
                "user_id": vic["user_id"],
                "payee_id": f"prize_claim_{random.randint(100,999)}@okaxis",
                "amount": round(random.uniform(8000, 24500), 2),
                "channel": "UPI",
                "device_id": f"DEV_{vic['user_id']}_1",
                "ip": f"103.{random.randint(10,220)}.{random.randint(1,220)}.12",
                "geo": vic["city"],
                "status": "challenged",
                "created_at": c_time.isoformat(),
                "is_fraud": 1,
                "scam_type": "collect_request_scam",
                "fraud_ring_id": None,
                "is_hard_negative": False,
                "hard_negative_type": None
            })
            
        # 4. Phishing / Social Engineering (total ~100 transactions)
        num_phish = int(target_fraud_count * 0.15)
        phish_victims = random.sample(self.users, min(num_phish, len(self.users)))
        for p_idx, vic in enumerate(phish_victims):
            p_day = random.uniform(4, self.duration_days - 4)
            p_time = self.start_date + timedelta(days=p_day, hours=random.randint(9, 21), minutes=random.randint(0, 59))
            all_txns.append({
                "txn_id": f"TXN_PHISH_GEN_{p_idx+1:04d}",
                "user_id": vic["user_id"],
                "payee_id": f"support_urgent_{random.randint(10,99)}@sbi",
                "amount": round(random.uniform(15000, 49000), 2),
                "channel": "UPI",
                "device_id": f"DEV_{vic['user_id']}_1",
                "ip": f"103.{random.randint(10,220)}.{random.randint(1,220)}.50",
                "geo": vic["city"],
                "status": "challenged",
                "created_at": p_time.isoformat(),
                "is_fraud": 1,
                "scam_type": "phishing_or_social_engineering",
                "fraud_ring_id": None,
                "is_hard_negative": False,
                "hard_negative_type": None
            })
            
        # 5. Card Testing (rapid micro-transactions followed by large extraction, ~75 transactions)
        num_card_bots = 15
        card_victims = random.sample(self.users, num_card_bots)
        for b_idx, vic in enumerate(card_victims):
            b_day = random.uniform(5, self.duration_days - 5)
            b_time = self.start_date + timedelta(days=b_day, hours=random.randint(1, 4), minutes=random.randint(0, 45))
            bot_dev = f"DEV_BOT_TESTER_{b_idx+1}"
            # 3 micro charges
            for m_i in range(3):
                all_txns.append({
                    "txn_id": f"TXN_TEST_{b_idx+1}_{m_i+1}",
                    "user_id": vic["user_id"],
                    "payee_id": "test_auth_bot@icici",
                    "amount": round(random.uniform(5.0, 45.0), 2),
                    "channel": "card",
                    "device_id": bot_dev,
                    "ip": f"195.201.{random.randint(10,250)}.{random.randint(1,250)}",
                    "geo": "Frankfurt",
                    "status": "approved",
                    "created_at": (b_time + timedelta(minutes=m_i*2)).isoformat(),
                    "is_fraud": 1,
                    "scam_type": "card_testing",
                    "fraud_ring_id": None,
                    "is_hard_negative": False,
                    "hard_negative_type": None
                })
            # 1 big transaction
            all_txns.append({
                "txn_id": f"TXN_TEST_{b_idx+1}_EXTRACT",
                "user_id": vic["user_id"],
                "payee_id": "test_auth_bot@icici",
                "amount": round(random.uniform(65000, 92000), 2),
                "channel": "card",
                "device_id": bot_dev,
                "ip": f"195.201.{random.randint(10,250)}.{random.randint(1,250)}",
                "geo": "Frankfurt",
                "status": "blocked",
                "created_at": (b_time + timedelta(minutes=7)).isoformat(),
                "is_fraud": 1,
                "scam_type": "card_testing",
                "fraud_ring_id": None,
                "is_hard_negative": False,
                "hard_negative_type": None
            })
            
        # 6. Concept Drift (Novel QR tampering in final 15 days, ~40 transactions)
        drift_victims = random.sample(self.users, 40)
        for d_idx, vic in enumerate(drift_victims):
            d_day = random.uniform(self.duration_days - self.drift_window_days + 1, self.duration_days - 1)
            d_time = self.start_date + timedelta(days=d_day, hours=random.randint(10, 20), minutes=random.randint(0, 59))
            all_txns.append({
                "txn_id": f"TXN_DRIFT_{d_idx+1:04d}",
                "user_id": vic["user_id"],
                "payee_id": f"qr_proxy_tamper_{random.randint(10,99)}@okaxis",
                "amount": round(random.uniform(12000, 36000), 2),
                "channel": "UPI",
                "device_id": f"DEV_{vic['user_id']}_1",
                "ip": f"103.{random.randint(10,220)}.{random.randint(1,220)}.9",
                "geo": vic["city"],
                "status": "blocked",
                "created_at": d_time.isoformat(),
                "is_fraud": 1,
                "scam_type": "qr_code_proxy_tampering",
                "fraud_ring_id": "RING_DRIFT_01",
                "is_hard_negative": False,
                "hard_negative_type": None
            })
            
        # 7. Realism Knob: Class-Conditional Label Noise
        # In real financial systems: ~2% of fraud goes undetected (label=0), and ~0.05% of legit transactions are disputed/unidentified anomalies (label=1)
        for t in all_txns:
            if t["is_fraud"] == 1 and random.random() < 0.02:
                # Undetected fraud
                t["is_fraud"] = 0
                t["scam_type"] = "none"
            elif t["is_fraud"] == 0 and random.random() < 0.0005:
                # Legitimate dispute / chargeback noise
                t["is_fraud"] = 1
                t["scam_type"] = "unidentified_anomaly"

        # Sort all transactions chronologically
        all_txns.sort(key=lambda x: x["created_at"])
        return all_txns

    def run(self, output_dir: Optional[str] = None) -> Dict[str, Any]:
        """Executes full generation lifecycle and saves partitioned datasets."""
        if output_dir is None:
            output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "processed", "synthetic")
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"Generating {self.num_users} user profiles...")
        self.generate_users()
        
        print("Generating registered devices and payees...")
        self.generate_devices_and_payees()
        
        print("Simulating legitimate transaction flow with hard negatives...")
        legit = self.generate_legitimate_transactions()
        
        print("Injecting fraud scenarios, mule clusters, and event hash chains...")
        final_txns = self.inject_fraud_scenarios(legit)
        
        # Prepare DataFrames
        df_users = pd.DataFrame(self.users)
        df_devices = pd.DataFrame(self.devices)
        df_payees = pd.DataFrame(self.payees)
        df_txns = pd.DataFrame(final_txns)
        df_events = pd.DataFrame(self.incident_events)
        
        df_labels = df_txns[["txn_id", "is_fraud", "scam_type", "fraud_ring_id"]].copy()
        
        # Save to CSV and Parquet
        print(f"Saving generated datasets to {output_dir}...")
        df_users.to_csv(os.path.join(output_dir, "users.csv"), index=False)
        df_devices.to_csv(os.path.join(output_dir, "devices.csv"), index=False)
        df_payees.to_csv(os.path.join(output_dir, "payees.csv"), index=False)
        df_txns.to_csv(os.path.join(output_dir, "transactions.csv"), index=False)
        df_events.to_csv(os.path.join(output_dir, "incident_events.csv"), index=False)
        df_labels.to_csv(os.path.join(output_dir, "labels.csv"), index=False)
        
        # Summary statistics
        total_txns = len(df_txns)
        fraud_txns = int((df_txns["is_fraud"] == 1).sum())
        prevalence = round(fraud_txns / total_txns * 100, 3)
        
        stats = {
            "generator_version": self.config["generator"]["version"],
            "seed": self.seed,
            "generated_at": datetime.utcnow().isoformat(),
            "time_range": {
                "start": self.start_date.isoformat(),
                "end": self.end_date.isoformat(),
                "duration_days": self.duration_days
            },
            "counts": {
                "users": len(df_users),
                "devices": len(df_devices),
                "payees": len(df_payees),
                "transactions": total_txns,
                "incident_events": len(df_events),
                "fraud_transactions": fraud_txns,
                "legit_transactions": total_txns - fraud_txns
            },
            "fraud_prevalence_pct": prevalence,
            "scam_type_distribution": df_txns["scam_type"].value_counts().to_dict(),
            "hard_negative_count": int(df_txns["is_hard_negative"].sum())
        }
        
        manifest_path = os.path.join(output_dir, "synthetic_manifest.json")
        with open(manifest_path, "w") as f:
            json.dump(stats, f, indent=2)
            
        print("Generation complete! Manifest saved.")
        return stats


if __name__ == "__main__":
    generator = FinSureSyntheticGenerator()
    summary = generator.run()
    print(json.dumps(summary, indent=2))
