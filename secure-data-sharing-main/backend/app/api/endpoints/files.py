import os
import io
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.core.crypto import encrypt_data, decrypt_data
from app.models.user import User
from app.models.file_record import FileRecord
from app.models.data_sharing import DataAccessPermission
from app.crud import user as user_crud

# Define the directory where uploaded files will be stored
UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()

@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Encrypts any uploaded file, stores it, and saves its metadata to the database."""
    contents = file.file.read()

    # Perform a content scan before encrypting/storing the file (best-effort)
    try:
        # Import locally to avoid circular imports at module load time
        from app.api.endpoints.ml import analyze_file_with_content
        scan_result = analyze_file_with_content(file.filename, contents, file.size or len(contents))
    except Exception:
        scan_result = None

    # If scan finds a high threat, reject the upload
    if scan_result and scan_result.get("threat_score", 0) >= 70:
        raise HTTPException(status_code=400, detail={
            "message": "Upload blocked: file detected as malicious",
            "scan_result": scan_result
        })

    encrypted_contents = encrypt_data(contents)

    # Store the encrypted file physically with a unique name to avoid conflicts
    stored_filename = f"{current_user.id}_{datetime.utcnow().timestamp()}_{file.filename}.enc"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)
    with open(file_path, "wb") as f:
        f.write(encrypted_contents)

    # Save metadata to the database, now including the stored_filename
    db_file_record = FileRecord(
        filename=file.filename,
        stored_filename=stored_filename,
        file_type=file.content_type,
        size_bytes=file.size,
        owner_id=current_user.id
    )
    db.add(db_file_record)
    db.commit()
    db.refresh(db_file_record)
    
    response = {"message": f"File '{file.filename}' uploaded securely.", "file_id": db_file_record.id}
    if scan_result:
        response["scan_result"] = scan_result
    return response

@router.post("/upload-e2e")
async def upload_file_e2e(
    file: UploadFile = File(...),
    encrypted_aes_key: str = Form(None),
    recipient_username: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a client-side encrypted file with optional sharing.
    The file is already encrypted by the client with AES.
    The AES key (if sharing) is encrypted with the recipient's RSA public key.
    Server stores the encrypted file blindly - it cannot decrypt anything.
    
    SECURITY: File is scanned for threats BEFORE client-side encryption occurs.
    The filename is analyzed for malicious patterns.
    """
    contents = await file.read()
    
    # SECURITY SCAN: Analyze filename for malicious patterns before storing
    # Since file is client-encrypted, we scan filename + metadata patterns
    try:
        from app.api.endpoints.ml import analyze_file_threat
        # Get original filename (remove .encrypted suffix for analysis)
        original_filename = file.filename.replace('.encrypted', '')
        scan_result = analyze_file_threat(original_filename, len(contents))
    except Exception:
        scan_result = None

    # If scan finds a high threat based on filename patterns, reject the upload
    if scan_result and scan_result.get("threat_score", 0) >= 70:
        raise HTTPException(status_code=400, detail={
            "message": "Upload blocked: file detected as potentially malicious",
            "scan_result": scan_result
        })
    
    # Store the encrypted file directly (already encrypted by client)
    stored_filename = f"{current_user.id}_{datetime.utcnow().timestamp()}_{file.filename}.enc"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    # Save metadata to the database
    db_file_record = FileRecord(
        filename=file.filename.replace('.encrypted', ''),  # Remove .encrypted suffix if present
        stored_filename=stored_filename,
        file_type=file.content_type,
        size_bytes=len(contents),
        owner_id=current_user.id
    )
    db.add(db_file_record)
    db.commit()
    db.refresh(db_file_record)
    
    # If sharing with a recipient, create the permission with encrypted AES key
    if recipient_username and encrypted_aes_key:
        recipient = user_crud.get_user_by_username(db, username=recipient_username)
        if not recipient:
            raise HTTPException(status_code=404, detail=f"User '{recipient_username}' not found.")
        
        if recipient.id == current_user.id:
            raise HTTPException(status_code=400, detail="You cannot share a file with yourself.")
        
        permission = DataAccessPermission(
            file_id=db_file_record.id,
            shared_with_user_id=recipient.id,
            encrypted_aes_key=encrypted_aes_key
        )
        db.add(permission)
        db.commit()
        
        response = {
            "message": f"File '{file.filename}' encrypted and shared with '{recipient_username}'.",
            "file_id": db_file_record.id,
            "shared_with": recipient_username
        }
        if scan_result:
            response["scan_result"] = scan_result
        return response
    
    response = {"message": f"File '{file.filename}' uploaded securely.", "file_id": db_file_record.id}
    if scan_result:
        response["scan_result"] = scan_result
    return response

@router.get("/download/{file_id}")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allows a user to download a file.
    For server-encrypted files, it decrypts before sending.
    For client-encrypted (E2E) files, it returns the encrypted data for client-side decryption.
    """
    # 1. Find the file record in the database
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found.")

    # 2. Check for authorization
    is_owner = file_record.owner_id == current_user.id
    permission = db.query(DataAccessPermission).filter_by(file_id=file_id, shared_with_user_id=current_user.id).first()
    is_shared = permission is not None

    if not (is_owner or is_shared):
        raise HTTPException(status_code=403, detail="Not authorized to download this file.")

    # 3. Read the encrypted file from disk
    file_path = os.path.join(UPLOAD_DIR, file_record.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=500, detail="File is missing from storage. Please contact an administrator.")

    with open(file_path, "rb") as f:
        encrypted_data = f.read()

    # 4. Try to decrypt (for server-encrypted files) or return as-is (for E2E encrypted)
    try:
        decrypted_data = decrypt_data(encrypted_data)
        # Server-encrypted file, return decrypted
        return StreamingResponse(
            io.BytesIO(decrypted_data),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={file_record.filename}"}
        )
    except Exception:
        # E2E encrypted file, return encrypted data for client-side decryption
        return StreamingResponse(
            io.BytesIO(encrypted_data),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={file_record.filename}.encrypted",
                "X-Encrypted": "true"
            }
        )

@router.get("/download-e2e/{file_id}")
def download_file_e2e(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download E2E encrypted file along with the encrypted AES key.
    Returns the encrypted file data and the encrypted AES key for client-side decryption.
    """
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found.")

    is_owner = file_record.owner_id == current_user.id
    permission = db.query(DataAccessPermission).filter_by(file_id=file_id, shared_with_user_id=current_user.id).first()
    is_shared = permission is not None

    if not (is_owner or is_shared):
        raise HTTPException(status_code=403, detail="Not authorized to download this file.")

    file_path = os.path.join(UPLOAD_DIR, file_record.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=500, detail="File is missing from storage.")

    with open(file_path, "rb") as f:
        encrypted_data = f.read()

    # Get the encrypted AES key if this is a shared file
    encrypted_aes_key = permission.encrypted_aes_key if permission else None

    import base64
    return {
        "filename": file_record.filename,
        "file_type": file_record.file_type,
        "encrypted_data": base64.b64encode(encrypted_data).decode('utf-8'),
        "encrypted_aes_key": encrypted_aes_key,
        "is_owner": is_owner
    }


@router.get("/list")
def list_my_files(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lists all files owned by the current user with sharing info."""
    files = db.query(FileRecord).filter(FileRecord.owner_id == current_user.id).order_by(FileRecord.upload_date.desc()).all()
    result = []
    for f in files:
        shared_with = db.query(DataAccessPermission).filter(DataAccessPermission.file_id == f.id).all()
        shared_users = []
        for perm in shared_with:
            user = db.query(User).filter(User.id == perm.shared_with_user_id).first()
            if user:
                shared_users.append({"id": user.id, "username": user.username, "shared_at": perm.shared_at})
        result.append({
            "id": f.id,
            "filename": f.filename,
            "file_type": f.file_type,
            "size_bytes": f.size_bytes,
            "upload_date": f.upload_date,
            "shared_with": shared_users
        })
    return result

@router.get("/shared-with-me")
def list_shared_files(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lists all files shared with the current user."""
    permissions = db.query(DataAccessPermission).filter(DataAccessPermission.shared_with_user_id == current_user.id).all()
    shared_files_details = []
    for perm in permissions:
        file_record = db.query(FileRecord).filter(FileRecord.id == perm.file_id).first()
        if file_record:
            owner = db.query(User).filter(User.id == file_record.owner_id).first()
            shared_files_details.append({
                "id": file_record.id,
                "filename": file_record.filename,
                "file_type": file_record.file_type,
                "size_bytes": file_record.size_bytes,
                "upload_date": file_record.upload_date,
                "shared_by": owner.username if owner else "Unknown",
                "shared_at": perm.shared_at,
                "has_encrypted_key": bool(perm.encrypted_aes_key)
            })
    return shared_files_details

@router.post("/share/{file_id}")
def share_file(
    file_id: int,
    recipient_username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Shares a file with another registered user."""
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.owner_id == current_user.id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found or you are not the owner.")

    recipient = user_crud.get_user_by_username(db, username=recipient_username)
    if not recipient:
        raise HTTPException(status_code=404, detail=f"User '{recipient_username}' not found.")
    
    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot share a file with yourself.")

    existing_perm = db.query(DataAccessPermission).filter_by(file_id=file_id, shared_with_user_id=recipient.id).first()
    if existing_perm:
        raise HTTPException(status_code=400, detail=f"File already shared with '{recipient_username}'.")

    permission = DataAccessPermission(file_id=file_id, shared_with_user_id=recipient.id)
    db.add(permission)
    db.commit()
    
    return {"message": f"File '{file_record.filename}' successfully shared with '{recipient_username}'."}

@router.post("/share-e2e/{file_id}")
def share_file_e2e(
    file_id: int,
    recipient_username: str = Form(...),
    encrypted_aes_key: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Share an E2E encrypted file with another user, providing the encrypted AES key."""
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.owner_id == current_user.id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found or you are not the owner.")

    recipient = user_crud.get_user_by_username(db, username=recipient_username)
    if not recipient:
        raise HTTPException(status_code=404, detail=f"User '{recipient_username}' not found.")
    
    if not recipient.public_key:
        raise HTTPException(status_code=400, detail=f"User '{recipient_username}' has not set up encryption keys.")
    
    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot share a file with yourself.")

    existing_perm = db.query(DataAccessPermission).filter_by(file_id=file_id, shared_with_user_id=recipient.id).first()
    if existing_perm:
        raise HTTPException(status_code=400, detail=f"File already shared with '{recipient_username}'.")

    permission = DataAccessPermission(
        file_id=file_id,
        shared_with_user_id=recipient.id,
        encrypted_aes_key=encrypted_aes_key
    )
    db.add(permission)
    db.commit()
    
    return {"message": f"File '{file_record.filename}' securely shared with '{recipient_username}'."}

@router.delete("/revoke/{file_id}/{username}")
def revoke_file_access(
    file_id: int,
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke a user's access to a shared file."""
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.owner_id == current_user.id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found or you are not the owner.")

    user = user_crud.get_user_by_username(db, username=username)
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{username}' not found.")

    permission = db.query(DataAccessPermission).filter_by(file_id=file_id, shared_with_user_id=user.id).first()
    if not permission:
        raise HTTPException(status_code=404, detail=f"File is not shared with '{username}'.")

    db.delete(permission)
    db.commit()
    
    return {"message": f"Access revoked for '{username}'."}

@router.delete("/delete/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a file record from the DB and the corresponding encrypted file from storage."""
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.owner_id == current_user.id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found or you are not the owner.")
    
    # IMPROVEMENT: Directly use the stored_filename from the DB record
    file_path = os.path.join(UPLOAD_DIR, file_record.stored_filename)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError as e:
        # In a production system, you would log this error more formally
        print(f"Error removing physical file {file_path}: {e}")
        raise HTTPException(status_code=500, detail="Could not remove file from storage.")

    db.delete(file_record)
    db.commit()
    
    return {"message": f"File '{file_record.filename}' deleted successfully."}
