from sqlalchemy.orm import Session
from app.models.data_sharing import DataAccessPermission
from app.models.user import User

def grant_access(db: Session, owner_id: int, recipient_id: int, filename: str):
    permission = DataAccessPermission(
        owner_id=owner_id,
        recipient_id=recipient_id,
        filename=filename
    )
    db.add(permission)
    db.commit()
    db.refresh(permission)
    return permission

def get_files_shared_with_user(db: Session, user_id: int):
    return db.query(DataAccessPermission).filter(DataAccessPermission.recipient_id == user_id).all()

def check_access_permission(db: Session, user_id: int, owner_username: str, filename: str):
    owner = db.query(User).filter(User.username == owner_username).first()
    if not owner:
        return False
    
    permission = db.query(DataAccessPermission).filter(
        DataAccessPermission.owner_id == owner.id,
        DataAccessPermission.recipient_id == user_id,
        DataAccessPermission.filename == filename
    ).first()
    
    return permission is not None
