"""
FinSure State & Profile Service
Manages user baseline behavioral profiles, rolling historical transaction windows,
familiarity sets, and entity graph linkages.
Supports Redis backing with an in-memory fallback.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Set
import numpy as np

logger = logging.getLogger("finsure.profile_service")


class ProfileService:
    """
    State manager for entity profiles, rolling transaction history, and familiarity caches.
    """
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = None
        self.is_redis_available = False

        # In-memory storage (primary or fail-safe fallback)
        self.user_profiles: Dict[str, Dict[str, Any]] = {}
        self.user_histories: Dict[str, List[Dict[str, Any]]] = {}
        self.user_payees: Dict[str, Set[str]] = {}
        self.user_devices: Dict[str, Set[str]] = {}
        self.device_users: Dict[str, Set[str]] = {}
        self.payee_users: Dict[str, Set[str]] = {}

        self._init_redis()

    def _init_redis(self):
        """Attempts connection to Redis, gracefully falling back to memory on failure."""
        try:
            import redis
            client = redis.from_url(self.redis_url, socket_timeout=1.0, socket_connect_timeout=1.0)
            client.ping()
            self.redis_client = client
            self.is_redis_available = True
            logger.info(f"Connected to Redis at {self.redis_url}")
        except Exception as e:
            self.redis_client = None
            self.is_redis_available = False
            logger.info(f"Redis unavailable ({e}). Operating in resilient in-memory fallback mode.")

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Retrieves user baseline profile. Returns default cold-start prior if user is first-seen.
        """
        if user_id in self.user_profiles:
            return self.user_profiles[user_id]
        
        # Default cold-start baseline priors
        return {
            "user_id": user_id,
            "mean_amount": 1300.0,
            "median_amount": 210.0,
            "std_amount": 2500.0,
            "daily_limit": 50000.0,
            "home_city": "Mumbai",
            "historical_txn_count": 0
        }

    def set_user_profile(self, user_id: str, profile_data: Dict[str, Any]):
        """Sets or updates a user's baseline profile."""
        self.user_profiles[user_id] = profile_data

    def get_user_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves rolling past transactions for user (most recent transactions, up to limit).
        Does NOT include the transaction currently being processed.
        """
        # Try redis first if available
        if self.is_redis_available and self.redis_client:
            try:
                raw_items = self.redis_client.lrange(f"history:{user_id}", 0, limit - 1)
                if raw_items:
                    return [json.loads(item) for item in raw_items]
            except Exception as e:
                logger.warning(f"Redis read error: {e}. Falling back to in-memory history.")

        return self.user_histories.get(user_id, [])[-limit:]

    def get_user_familiarity(self, user_id: str, payee_id: str, device_id: str) -> Dict[str, Any]:
        """
        Checks entity familiarity history for user.
        """
        payees = self.user_payees.get(user_id, set())
        devices = self.user_devices.get(user_id, set())

        is_new_payee = payee_id not in payees
        is_new_device = device_id not in devices

        return {
            "is_new_payee": 1 if is_new_payee else 0,
            "is_new_device": 1 if is_new_device else 0,
            "payee_familiarity_count": 0 if is_new_payee else 10,
            "device_familiarity_count": 0 if is_new_device else 25
        }

    def record_transaction(self, txn: Dict[str, Any]):
        """
        Records a completed transaction into user's rolling history and entity graphs.
        """
        user_id = str(txn.get("user_id"))
        payee_id = str(txn.get("payee_id"))
        device_id = str(txn.get("device_id"))

        # 1. Update in-memory history
        if user_id not in self.user_histories:
            self.user_histories[user_id] = []
        
        history_item = {
            "transaction_id": txn.get("transaction_id"),
            "timestamp": str(txn.get("timestamp")),
            "amount": float(txn.get("amount", 0.0)),
            "payee_id": payee_id,
            "device_id": device_id,
            "channel": txn.get("channel", "upi"),
            "city": txn.get("city", "Mumbai")
        }
        self.user_histories[user_id].append(history_item)
        if len(self.user_histories[user_id]) > 100:
            self.user_histories[user_id] = self.user_histories[user_id][-100:]

        # 2. Update familiarity sets
        if user_id not in self.user_payees:
            self.user_payees[user_id] = set()
        self.user_payees[user_id].add(payee_id)

        if user_id not in self.user_devices:
            self.user_devices[user_id] = set()
        self.user_devices[user_id].add(device_id)

        # 3. Update multi-account graph linkage
        if device_id not in self.device_users:
            self.device_users[device_id] = set()
        self.device_users[device_id].add(user_id)

        if payee_id not in self.payee_users:
            self.payee_users[payee_id] = set()
        self.payee_users[payee_id].add(user_id)

        # 4. Update Redis if active
        if self.is_redis_available and self.redis_client:
            try:
                self.redis_client.lpush(f"history:{user_id}", json.dumps(history_item))
                self.redis_client.ltrim(f"history:{user_id}", 0, 99)
            except Exception as e:
                logger.warning(f"Redis write error: {e}")
