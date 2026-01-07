from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from .file_record import FileRecord

class DataAccessPermission(Base):
    """
    Represents a sharing permission in the database.
    Links a specific file to a user who has been granted access.
    Stores the encrypted AES key (encrypted with recipient's public RSA key).
    """
    __tablename__ = "data_access_permissions"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("file_records.id"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    encrypted_aes_key = Column(Text, nullable=True)  # AES key encrypted with recipient's RSA public key
    shared_at = Column(DateTime, default=datetime.utcnow)

    file = relationship("FileRecord", back_populates="shared_with")
    shared_with_user = relationship("User")

