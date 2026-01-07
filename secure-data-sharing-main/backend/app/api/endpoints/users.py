from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud
from app.schemas.user import User, UserCreate, UserPublicKey
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User as UserModel
from typing import List
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

router = APIRouter()

def generate_rsa_keypair():
    """Generate RSA key pair for encryption."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    
    # Serialize keys to PEM format
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')
    
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    
    return private_pem, public_pem

def ensure_user_has_keys(user: UserModel, db: Session):
    """Ensure a user has encryption keys, generate if missing."""
    if not user.public_key:
        private_key, public_key = generate_rsa_keypair()
        user.public_key = public_key
        user.private_key = private_key
        db.commit()
        db.refresh(user)
    return user

@router.post("/register", response_model=User)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = crud.user.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    return crud.user.create_user(db=db, user=user)

@router.get("/public-key/{username}")
def get_user_public_key(username: str, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Get a user's public key for file sharing encryption."""
    user = crud.user.get_user_by_username(db, username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.public_key:
        raise HTTPException(status_code=400, detail="User has not set up their encryption keys yet")
    return {"username": user.username, "public_key": user.public_key}

@router.post("/public-key")
def set_user_public_key(key_data: UserPublicKey, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Set the current user's public key."""
    current_user.public_key = key_data.public_key
    db.commit()
    return {"message": "Public key updated successfully"}

@router.get("/search")
def search_users(query: str, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Search for users by username. Auto-generates encryption keys for users who don't have them."""
    if len(query) < 2:
        return []
    users = db.query(UserModel).filter(
        UserModel.username.ilike(f"%{query}%"),
        UserModel.id != current_user.id
    ).limit(10).all()
    
    result = []
    for u in users:
        # Auto-generate keys for users who don't have them
        if not u.public_key:
            ensure_user_has_keys(u, db)
        result.append({"id": u.id, "username": u.username, "has_public_key": bool(u.public_key)})
    
    return result


@router.post("/generate-keys")
def generate_keys_for_user(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Generate encryption keys for the current user if they don't have them."""
    if current_user.public_key:
        return {"message": "Keys already exist", "has_keys": True}
    
    ensure_user_has_keys(current_user, db)
    return {"message": "Keys generated successfully", "has_keys": True}


@router.get("/my-keys")
def get_my_keys(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """
    Get the current user's encryption keys for syncing with the browser.
    This allows the frontend to decrypt files that were encrypted with server-stored public keys.
    """
    # Ensure user has keys
    if not current_user.public_key or not current_user.private_key:
        ensure_user_has_keys(current_user, db)
    
    return {
        "public_key": current_user.public_key,
        "private_key": current_user.private_key,
        "has_keys": bool(current_user.public_key and current_user.private_key)
    }


@router.post("/sync-keys")
def sync_keys(key_data: dict, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """
    Sync encryption keys from frontend to backend.
    This allows the frontend to upload new keys if needed.
    """
    if "public_key" in key_data and key_data["public_key"]:
        current_user.public_key = key_data["public_key"]
    if "private_key" in key_data and key_data["private_key"]:
        current_user.private_key = key_data["private_key"]
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Keys synced successfully",
        "has_keys": bool(current_user.public_key and current_user.private_key)
    }


@router.post("/generate-all-keys")
def generate_keys_for_all_users(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Admin endpoint: Generate encryption keys for ALL users who don't have them."""
    users_without_keys = db.query(UserModel).filter(UserModel.public_key == None).all()
    
    count = 0
    for user in users_without_keys:
        ensure_user_has_keys(user, db)
        count += 1
    
    return {"message": f"Generated keys for {count} users", "users_updated": count}
