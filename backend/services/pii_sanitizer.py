"""
FinSure PII Masking & Prompt Injection Defense Service
Ensures sensitive identifiers (phone, email, VPA, IP, device) are deterministically masked
and untrusted inputs (payee names, VPAs, notes, free text) are sanitized and isolated
from prompt injection attempts.
"""

import re
from typing import Dict, Any, List, Tuple, Union

# Common prompt injection triggers and adversarial control phrases
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior)\s+instructions",
    r"you\s+are\s+now\s+(an?|the)?",
    r"system\s+prompt",
    r"override\s+(verdict|decision|risk|policy)",
    r"confirm\s+fraud\s*=\s*(false|0|no)",
    r"mark\s+as\s+(legit|legitimate|not\s+fraud)",
    r"admin\s+bypass",
    r"jailbreak",
    r"drop\s+table",
    r"<script\b",
    r"eval\(",
]

_COMPILED_INJECTION_REGEXES = [
    re.compile(pattern, re.IGNORECASE) for pattern in PROMPT_INJECTION_PATTERNS
]


def mask_email(email: str) -> str:
    """Masks email address, e.g., 'alice.smith@example.com' -> 'al***@example.com'."""
    if not email or "@" not in email:
        return email
    parts = email.split("@", 1)
    local, domain = parts[0], parts[1]
    if len(local) <= 2:
        masked_local = local[0] + "***" if len(local) >= 1 else "***"
    else:
        masked_local = local[:2] + "***"
    return f"{masked_local}@{domain}"


def mask_phone(phone: str) -> str:
    """Masks phone number, e.g., '+919876543210' -> '+91 *** *** 3210' or '***3210'."""
    if not phone:
        return phone
    digits = re.sub(r"\D", "", phone)
    if len(digits) >= 10:
        last4 = digits[-4:]
        prefix = phone[:3] if phone.startswith("+") else ""
        return f"{prefix} *** *** {last4}".strip()
    elif len(digits) >= 4:
        return f"***{digits[-4:]}"
    return "***"


def mask_vpa(vpa: str) -> str:
    """Masks VPA handle, e.g., 'merchant.payee@okaxis' -> 'me***@okaxis'."""
    if not vpa or "@" not in vpa:
        return vpa
    handle, provider = vpa.split("@", 1)
    if len(handle) <= 2:
        masked_handle = handle[0] + "***" if len(handle) >= 1 else "***"
    else:
        masked_handle = handle[:2] + "***"
    return f"{masked_handle}@{provider}"


def mask_ip(ip: str) -> str:
    """Masks IP address, e.g., '103.87.24.12' -> '103.87.x.x'."""
    if not ip:
        return ip
    parts = ip.split(".")
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.x.x"
    # IPv6 fallback
    if ":" in ip:
        colon_parts = ip.split(":")
        return f"{colon_parts[0]}:***"
    return ip


def mask_device_id(device_id: str) -> str:
    """Masks device identifier, e.g., 'DEV_849203948572' -> 'DEV_***8572'."""
    if not device_id:
        return device_id
    if len(device_id) > 6:
        prefix = device_id[:4] if "_" in device_id else device_id[:2]
        suffix = device_id[-4:]
        return f"{prefix}***{suffix}"
    return "***"


def mask_data_dict(data: Union[Dict[str, Any], List[Any], Any]) -> Any:
    """Recursively traverses a dictionary or list, applying deterministic masking to sensitive fields."""
    if isinstance(data, dict):
        masked_dict = {}
        for k, v in data.items():
            key_lower = k.lower()
            if "email" in key_lower and isinstance(v, str):
                masked_dict[k] = mask_email(v)
            elif ("phone" in key_lower or "mobile" in key_lower) and isinstance(v, str):
                masked_dict[k] = mask_phone(v)
            elif ("vpa" in key_lower or "upi_id" in key_lower) and isinstance(v, str):
                masked_dict[k] = mask_vpa(v)
            elif ("ip" in key_lower or "ip_address" in key_lower) and isinstance(v, str):
                masked_dict[k] = mask_ip(v)
            elif ("device" in key_lower or "fingerprint" in key_lower) and isinstance(v, str):
                masked_dict[k] = mask_device_id(v)
            else:
                masked_dict[k] = mask_data_dict(v)
        return masked_dict
    elif isinstance(data, list):
        return [mask_data_dict(item) for item in data]
    return data


def detect_prompt_injection(text: str) -> Tuple[bool, List[str]]:
    """Checks untrusted text for known prompt-injection triggers."""
    if not text:
        return False, []
    matches = []
    for reg in _COMPILED_INJECTION_REGEXES:
        match = reg.search(text)
        if match:
            matches.append(match.group(0))
    return len(matches) > 0, matches


def sanitize_untrusted_text(text: str) -> str:
    """
    Sanitizes untrusted text and encloses it in strict XML data delimiters.
    Strips raw control characters, neutralizes command injections, and tags the payload.
    """
    if not text:
        return ""
    # Strip null bytes and non-printable control characters (except newline, tab)
    clean_text = "".join(ch for ch in text if ch.isprintable() or ch in "\n\r\t")
    # Neutralize XML tag spoofing
    clean_text = clean_text.replace("<UNTRUSTED_DATA>", "[UNTRUSTED_DATA_TAG_ESCAPED]")
    clean_text = clean_text.replace("</UNTRUSTED_DATA>", "[/UNTRUSTED_DATA_TAG_ESCAPED]")
    # Wrap in explicit boundaries
    return f"<UNTRUSTED_DATA>\n{clean_text.strip()}\n</UNTRUSTED_DATA>"
