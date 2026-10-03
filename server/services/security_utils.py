"""
Utilidades de seguridad compartidas (LuXius).

- is_safe_url(): anti-SSRF (solo http/https hacia IPs públicas).
- LoginThrottle: bloqueo temporal por fuerza bruta (IP + usuario).
- telegram_webhook_secret(): secreto estable para validar el webhook de Telegram.
"""
import hashlib
import hmac
import ipaddress
import os
import socket
import threading
import time
from urllib.parse import urlparse

_BLOCKED_HOSTNAMES = {
    'localhost', 'metadata.google.internal', 'metadata', 'instance-data',
}


def _ip_is_public(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    return not (
        ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast
        or ip.is_reserved or ip.is_unspecified
    )


def is_safe_url(url: str) -> bool:
    """True si la URL es http/https y TODAS las IPs resueltas son públicas (anti-SSRF)."""
    try:
        parsed = urlparse(str(url or '').strip())
        if parsed.scheme not in ('http', 'https'):
            return False
        hostname = (parsed.hostname or '').lower()
        if not hostname or hostname in _BLOCKED_HOSTNAMES or hostname.endswith('.internal') or hostname.endswith('.local'):
            return False
        infos = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == 'https' else 80))
        ips = {info[4][0] for info in infos}
        return bool(ips) and all(_ip_is_public(ip) for ip in ips)
    except Exception:
        return False


class LoginThrottle:
    """Limitador en memoria de intentos fallidos de login (por proceso)."""

    def __init__(self, max_failures=5, window_seconds=900, lock_seconds=900):
        self.max_failures = max_failures
        self.window = window_seconds
        self.lock = lock_seconds
        self._failures = {}   # key -> [timestamps]
        self._locked = {}     # key -> unlock_ts
        self._mutex = threading.Lock()

    def _keys(self, ip, username):
        u = (username or '').strip().lower()
        return [f"ipu:{ip}:{u}", f"ip:{ip}"]

    def retry_after(self, ip, username) -> int:
        now = time.time()
        with self._mutex:
            for key in self._keys(ip, username):
                until = self._locked.get(key)
                if until and until > now:
                    return int(until - now) + 1
                if until:
                    self._locked.pop(key, None)
        return 0

    def register_failure(self, ip, username):
        now = time.time()
        with self._mutex:
            for idx, key in enumerate(self._keys(ip, username)):
                # Por IP global se permite más margen (varios usuarios detrás de la misma IP)
                limit = self.max_failures if idx == 0 else self.max_failures * 4
                arr = [t for t in self._failures.get(key, []) if now - t < self.window]
                arr.append(now)
                self._failures[key] = arr
                if len(arr) >= limit:
                    self._locked[key] = now + self.lock
                    self._failures[key] = []

    def register_success(self, ip, username):
        with self._mutex:
            key = self._keys(ip, username)[0]
            self._failures.pop(key, None)
            self._locked.pop(key, None)


login_throttle = LoginThrottle()


def telegram_webhook_secret(bot_token: str) -> str:
    """Secreto estable (A-Z a-z 0-9 _ -) para el header X-Telegram-Bot-Api-Secret-Token."""
    explicit = os.environ.get('TELEGRAM_WEBHOOK_SECRET', '').strip()
    if explicit:
        return explicit
    base = os.environ.get('JWT_SECRET_KEY') or os.environ.get('JWT_SECRET') or ''
    if not base or not bot_token:
        return ''
    return hmac.new(base.encode(), str(bot_token).encode(), hashlib.sha256).hexdigest()


def client_ip(req) -> str:
    """IP real del cliente (Render pone la IP original al inicio de X-Forwarded-For)."""
    fwd = req.headers.get('X-Forwarded-For', '')
    if fwd:
        return fwd.split(',')[0].strip()
    return req.remote_addr or 'unknown'
