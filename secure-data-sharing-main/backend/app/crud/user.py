from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password
from sqlalchemy import update
# for migration fallback
from passlib.context import CryptContext

# CryptContext for legacy bcrypt hashes (do not make this default)
legacy_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def create_user(db: Session, user: UserCreate):
    db_user = User(
        username=user.username,
        hashed_password=get_password_hash(user.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, username: str, password: str):
    """Check if user exists and password matches"""
    user = get_user_by_username(db, username)
    if not user:
        return None
    # Try current scheme first
    if verify_password(password, user.hashed_password):
        return user

    # Legacy bcrypt fallback: if stored hash looks like bcrypt, try verifying
    # with a bcrypt-only context, then re-hash into the current scheme.
    try:
        if user.hashed_password and user.hashed_password.startswith(('$2a$','$2b$','$2y$')):
            if legacy_pwd_ctx.verify(password, user.hashed_password):
                # re-hash using current scheme and update DB
                new_hash = get_password_hash(password)
                db.execute(update(User).where(User.id == user.id).values(hashed_password=new_hash))
                db.commit()
                # refresh object
                db.refresh(user)
                return user
    except Exception:
        # ignore fallback errors and treat as failed auth
        pass

    return None
    return user
