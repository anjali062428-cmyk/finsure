"""
FinSure Authentication Repository
Provides thread-safe persistence for users, OTPs, refresh tokens, step-up challenges,
and immutable authentication audit logs using SQLite.
"""

import os
import sqlite3
import threading
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta

from backend.models.auth import User, OTPRecord, RefreshTokenRecord, StepUpChallenge, AuthAuditLog
from backend.core.config import config

logger = logging.getLogger("finsure.auth_repo")


class AuthRepository:
    """Thread-safe SQLite repository for authentication data."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or config.AUTH_DB_PATH
        self._lock = threading.Lock()
        if self.db_path == ":memory:":
            self._mem_conn = sqlite3.connect(":memory:", check_same_thread=False)
            self._mem_conn.row_factory = sqlite3.Row
        else:
            self._mem_conn = None
            os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        if self._mem_conn is not None:
            return self._mem_conn
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Creates tables and indexes if they do not exist."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()

                # Users table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        user_id TEXT PRIMARY KEY,
                        full_name TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        phone TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'customer',
                        email_verified INTEGER NOT NULL DEFAULT 0,
                        phone_verified INTEGER NOT NULL DEFAULT 0,
                        account_status TEXT NOT NULL DEFAULT 'pending_verification',
                        failed_login_count INTEGER NOT NULL DEFAULT 0,
                        locked_until TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        last_login_at TEXT
                    )
                """)

                # OTP codes table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS otp_codes (
                        otp_id TEXT PRIMARY KEY,
                        user_id TEXT,
                        identifier TEXT NOT NULL,
                        channel TEXT NOT NULL,
                        purpose TEXT NOT NULL,
                        code_hash TEXT NOT NULL,
                        salt TEXT NOT NULL,
                        attempts INTEGER NOT NULL DEFAULT 0,
                        max_attempts INTEGER NOT NULL DEFAULT 5,
                        expires_at TEXT NOT NULL,
                        used_at TEXT,
                        created_at TEXT NOT NULL
                    )
                """)

                # Refresh tokens table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS refresh_tokens (
                        jti TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        token_hash TEXT NOT NULL,
                        device_id TEXT,
                        expires_at TEXT NOT NULL,
                        revoked_at TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(user_id)
                    )
                """)

                # Step-up challenges table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS step_up_challenges (
                        challenge_id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        transaction_id TEXT,
                        otp_id TEXT NOT NULL,
                        verified INTEGER NOT NULL DEFAULT 0,
                        expires_at TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(user_id)
                    )
                """)

                # Auth Audit log table (append-only)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS auth_audit_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_id TEXT NOT NULL UNIQUE,
                        actor_id TEXT,
                        event_type TEXT NOT NULL,
                        channel TEXT,
                        status TEXT NOT NULL,
                        ip_address TEXT,
                        request_id TEXT,
                        reason_category TEXT,
                        metadata_json TEXT,
                        timestamp TEXT NOT NULL
                    )
                """)

                # Indexes for fast lookup
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_otp_identifier_purpose ON otp_codes(identifier, purpose)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_actor ON auth_audit_logs(actor_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON auth_audit_logs(timestamp)")

                conn.commit()

    # -------------------------------------------------------------
    # User Management
    # -------------------------------------------------------------
    def create_user(self, user: User) -> User:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO users (
                        user_id, full_name, email, phone, password_hash, role,
                        email_verified, phone_verified, account_status,
                        failed_login_count, locked_until, created_at, updated_at, last_login_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user.user_id, user.full_name, user.email.lower().strip(),
                    user.phone.strip(), user.password_hash, user.role,
                    1 if user.email_verified else 0,
                    1 if user.phone_verified else 0,
                    user.account_status, user.failed_login_count,
                    user.locked_until, user.created_at, user.updated_at, user.last_login_at
                ))
                conn.commit()
                return user

    def _row_to_user(self, row: sqlite3.Row) -> User:
        return User(
            user_id=row["user_id"],
            full_name=row["full_name"],
            email=row["email"],
            phone=row["phone"],
            password_hash=row["password_hash"],
            role=row["role"],
            email_verified=bool(row["email_verified"]),
            phone_verified=bool(row["phone_verified"]),
            account_status=row["account_status"],
            failed_login_count=row["failed_login_count"],
            locked_until=row["locked_until"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            last_login_at=row["last_login_at"]
        )

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
                row = cursor.fetchone()
                return self._row_to_user(row) if row else None

    def get_user_by_email(self, email: str) -> Optional[User]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))
                row = cursor.fetchone()
                return self._row_to_user(row) if row else None

    def get_user_by_phone(self, phone: str) -> Optional[User]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE phone = ?", (phone.strip(),))
                row = cursor.fetchone()
                return self._row_to_user(row) if row else None

    def get_user_by_identifier(self, identifier: str) -> Optional[User]:
        """Looks up user by email or phone seamlessly."""
        cleaned = identifier.strip()
        if "@" in cleaned:
            return self.get_user_by_email(cleaned)
        return self.get_user_by_phone(cleaned)

    def update_user(self, user: User) -> User:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE users SET
                        full_name = ?,
                        email = ?,
                        phone = ?,
                        password_hash = ?,
                        role = ?,
                        email_verified = ?,
                        phone_verified = ?,
                        account_status = ?,
                        failed_login_count = ?,
                        locked_until = ?,
                        updated_at = ?,
                        last_login_at = ?
                    WHERE user_id = ?
                """, (
                    user.full_name, user.email.lower().strip(), user.phone.strip(),
                    user.password_hash, user.role,
                    1 if user.email_verified else 0,
                    1 if user.phone_verified else 0,
                    user.account_status, user.failed_login_count,
                    user.locked_until, user.updated_at, user.last_login_at,
                    user.user_id
                ))
                conn.commit()
                return user

    def update_verification_status(
        self,
        user_id: str,
        email_verified: Optional[bool] = None,
        phone_verified: Optional[bool] = None,
        account_status: Optional[str] = None
    ) -> Optional[User]:
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        now_str = datetime.now(timezone.utc).isoformat()
        if email_verified is not None:
            user.email_verified = email_verified
        if phone_verified is not None:
            user.phone_verified = phone_verified
        # If both verified, transition to active if previously pending
        if user.email_verified and user.phone_verified and user.account_status == "pending_verification":
            user.account_status = "active"
        if account_status is not None:
            user.account_status = account_status
        user.updated_at = now_str
        return self.update_user(user)

    def list_users(
        self,
        role: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[User], int]:
        """
        Lists users with optional role, status, and search filters with pagination.
        Returns: (users_list, total_count)
        """
        query_conditions = []
        params: List[Any] = []

        if role:
            query_conditions.append("role = ?")
            params.append(role)

        if status:
            query_conditions.append("account_status = ?")
            params.append(status)

        if search:
            search_param = f"%{search.strip().lower()}%"
            query_conditions.append("(LOWER(full_name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ? OR user_id LIKE ?)")
            params.extend([search_param, search_param, search_param, search_param])

        where_clause = f"WHERE {' AND '.join(query_conditions)}" if query_conditions else ""

        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Count total matching rows
                count_query = f"SELECT COUNT(*) as total FROM users {where_clause}"
                cursor.execute(count_query, params)
                total_count = cursor.fetchone()["total"]

                # Fetch paginated rows ordered by creation date
                fetch_query = f"""
                    SELECT * FROM users 
                    {where_clause} 
                    ORDER BY created_at DESC 
                    LIMIT ? OFFSET ?
                """
                cursor.execute(fetch_query, params + [max(1, min(limit, 100)), max(0, offset)])
                rows = cursor.fetchall()
                users = [self._row_to_user(r) for r in rows]

                return users, total_count

    def update_user_status(
        self,
        user_id: str,
        new_status: str,
        locked_until: Optional[str] = None
    ) -> Optional[User]:
        """Updates account status (active, suspended, locked) and lockout timestamp."""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        now_str = datetime.now(timezone.utc).isoformat()
        user.account_status = new_status
        user.locked_until = locked_until
        if new_status == "active":
            user.failed_login_count = 0
            user.locked_until = None
        user.updated_at = now_str
        return self.update_user(user)

    def update_user_role(
        self,
        user_id: str,
        new_role: str
    ) -> Optional[User]:
        """Updates user's assigned RBAC role."""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        now_str = datetime.now(timezone.utc).isoformat()
        user.role = new_role
        user.updated_at = now_str
        return self.update_user(user)

    def record_login_failure(self, user_id: str, max_failures: int = 5, lockout_minutes: int = 15) -> int:
        """Increments failed login counter and locks account if threshold exceeded."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT failed_login_count FROM users WHERE user_id = ?", (user_id,))
                row = cursor.fetchone()
                if not row:
                    return 0
                count = row["failed_login_count"] + 1
                locked_until = None
                status_update = "active"
                if count >= max_failures:
                    lock_time = datetime.now(timezone.utc) + timedelta(minutes=lockout_minutes)
                    locked_until = lock_time.isoformat()
                    status_update = "locked"

                cursor.execute("""
                    UPDATE users SET
                        failed_login_count = ?,
                        locked_until = ?,
                        account_status = CASE WHEN ? = 'locked' THEN 'locked' ELSE account_status END,
                        updated_at = ?
                    WHERE user_id = ?
                """, (count, locked_until, status_update, datetime.now(timezone.utc).isoformat(), user_id))
                conn.commit()
                return count

    def reset_login_failures(self, user_id: str, last_login_at: str):
        """Resets failed login count and updates last_login_at upon successful login."""
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE users SET
                        failed_login_count = 0,
                        locked_until = NULL,
                        account_status = CASE WHEN account_status = 'locked' THEN 'active' ELSE account_status END,
                        last_login_at = ?,
                        updated_at = ?
                    WHERE user_id = ?
                """, (last_login_at, datetime.now(timezone.utc).isoformat(), user_id))
                conn.commit()

    def update_password(self, user_id: str, password_hash: str):
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE users SET
                        password_hash = ?,
                        failed_login_count = 0,
                        locked_until = NULL,
                        updated_at = ?
                    WHERE user_id = ?
                """, (password_hash, datetime.now(timezone.utc).isoformat(), user_id))
                conn.commit()

    # -------------------------------------------------------------
    # OTP Management
    # -------------------------------------------------------------
    def save_otp(self, otp: OTPRecord) -> OTPRecord:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO otp_codes (
                        otp_id, user_id, identifier, channel, purpose,
                        code_hash, salt, attempts, max_attempts, expires_at, used_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    otp.otp_id, otp.user_id, otp.identifier.lower().strip(),
                    otp.channel, otp.purpose, otp.code_hash, otp.salt,
                    otp.attempts, otp.max_attempts, otp.expires_at, otp.used_at, otp.created_at
                ))
                conn.commit()
                return otp

    def _row_to_otp(self, row: sqlite3.Row) -> OTPRecord:
        return OTPRecord(
            otp_id=row["otp_id"],
            user_id=row["user_id"],
            identifier=row["identifier"],
            channel=row["channel"],
            purpose=row["purpose"],
            code_hash=row["code_hash"],
            salt=row["salt"],
            attempts=row["attempts"],
            max_attempts=row["max_attempts"],
            expires_at=row["expires_at"],
            used_at=row["used_at"],
            created_at=row["created_at"]
        )

    def get_latest_otp(self, identifier: str, purpose: str) -> Optional[OTPRecord]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM otp_codes
                    WHERE identifier = ? AND purpose = ?
                    ORDER BY created_at DESC LIMIT 1
                """, (identifier.lower().strip(), purpose))
                row = cursor.fetchone()
                return self._row_to_otp(row) if row else None

    def get_otp_by_id(self, otp_id: str) -> Optional[OTPRecord]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM otp_codes WHERE otp_id = ?", (otp_id,))
                row = cursor.fetchone()
                return self._row_to_otp(row) if row else None

    def increment_otp_attempts(self, otp_id: str) -> int:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT attempts FROM otp_codes WHERE otp_id = ?", (otp_id,))
                row = cursor.fetchone()
                if not row:
                    return 0
                new_attempts = row["attempts"] + 1
                cursor.execute("UPDATE otp_codes SET attempts = ? WHERE otp_id = ?", (new_attempts, otp_id))
                conn.commit()
                return new_attempts

    def mark_otp_used(self, otp_id: str, used_at: str):
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE otp_codes SET used_at = ? WHERE otp_id = ?", (used_at, otp_id))
                conn.commit()

    # -------------------------------------------------------------
    # Refresh Tokens
    # -------------------------------------------------------------
    def save_refresh_token(self, record: RefreshTokenRecord):
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO refresh_tokens (
                        jti, user_id, token_hash, device_id, expires_at, revoked_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    record.jti, record.user_id, record.token_hash,
                    record.device_id, record.expires_at, record.revoked_at, record.created_at
                ))
                conn.commit()

    def get_refresh_token(self, jti: str) -> Optional[RefreshTokenRecord]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM refresh_tokens WHERE jti = ?", (jti,))
                row = cursor.fetchone()
                if not row:
                    return None
                return RefreshTokenRecord(
                    jti=row["jti"],
                    user_id=row["user_id"],
                    token_hash=row["token_hash"],
                    device_id=row["device_id"],
                    expires_at=row["expires_at"],
                    revoked_at=row["revoked_at"],
                    created_at=row["created_at"]
                )

    def revoke_refresh_token(self, jti: str, revoked_at: str):
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE refresh_tokens SET revoked_at = ? WHERE jti = ?", (revoked_at, jti))
                conn.commit()

    def revoke_all_user_tokens(self, user_id: str, revoked_at: str):
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", (revoked_at, user_id))
                conn.commit()

    # -------------------------------------------------------------
    # Step-Up Challenges
    # -------------------------------------------------------------
    def save_step_up_challenge(self, challenge: StepUpChallenge):
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO step_up_challenges (
                        challenge_id, user_id, transaction_id, otp_id, verified, expires_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    challenge.challenge_id, challenge.user_id, challenge.transaction_id,
                    challenge.otp_id, 1 if challenge.verified else 0,
                    challenge.expires_at, challenge.created_at
                ))
                conn.commit()

    def get_step_up_challenge(self, challenge_id: str) -> Optional[StepUpChallenge]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM step_up_challenges WHERE challenge_id = ?", (challenge_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                return StepUpChallenge(
                    challenge_id=row["challenge_id"],
                    user_id=row["user_id"],
                    transaction_id=row["transaction_id"],
                    otp_id=row["otp_id"],
                    verified=bool(row["verified"]),
                    expires_at=row["expires_at"],
                    created_at=row["created_at"]
                )

    def mark_step_up_verified(self, challenge_id: str):
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE step_up_challenges SET verified = 1 WHERE challenge_id = ?", (challenge_id,))
                conn.commit()

    # -------------------------------------------------------------
    # Immutable Auth Audit Logs
    # -------------------------------------------------------------
    def append_audit_log(self, log: AuthAuditLog):
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO auth_audit_logs (
                        event_id, actor_id, event_type, channel, status,
                        ip_address, request_id, reason_category, metadata_json, timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    log.event_id, log.actor_id, log.event_type, log.channel,
                    log.status, log.ip_address, log.request_id, log.reason_category,
                    log.metadata_json, log.timestamp
                ))
                conn.commit()

    def get_audit_logs(self, actor_id: Optional[str] = None, limit: int = 100) -> List[AuthAuditLog]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                if actor_id:
                    cursor.execute("""
                        SELECT * FROM auth_audit_logs
                        WHERE actor_id = ?
                        ORDER BY id DESC LIMIT ?
                    """, (actor_id, limit))
                else:
                    cursor.execute("""
                        SELECT * FROM auth_audit_logs
                        ORDER BY id DESC LIMIT ?
                    """, (limit,))
                rows = cursor.fetchall()
                return [
                    AuthAuditLog(
                        id=row["id"],
                        event_id=row["event_id"],
                        actor_id=row["actor_id"],
                        event_type=row["event_type"],
                        channel=row["channel"],
                        status=row["status"],
                        ip_address=row["ip_address"],
                        request_id=row["request_id"],
                        reason_category=row["reason_category"],
                        metadata_json=row["metadata_json"],
                        timestamp=row["timestamp"]
                    )
                    for row in rows
                ]
