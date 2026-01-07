import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from passlib.context import CryptContext
from jose import jwt, JWTError
from passlib.exc import UnknownHashError

# ---- Password hashing (use pbkdf2_sha256 to avoid bcrypt backend issues) ----
# pbkdf2_sha256 is pure-Python and avoids native bcrypt backend problems
# If you want to migrate existing bcrypt hashes, re-hash user passwords
# on next login or provide a password-reset flow.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except UnknownHashError:
        # The stored hash uses an unknown scheme for the current context
        # Caller may attempt a legacy verification fallback (e.g. bcrypt)
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# ---- JWT settings ----
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    # Raises JWTError on failure; let callers handle
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
