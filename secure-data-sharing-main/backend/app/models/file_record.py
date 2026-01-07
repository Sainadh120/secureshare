from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class FileRecord(Base):
    __tablename__ = "file_records"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    
    # --- THIS IS THE NEW, REQUIRED FIELD ---
    # It will store the unique, encrypted filename used on the server.
    stored_filename = Column(String, unique=True, index=True)
    
    file_type = Column(String)
    size_bytes = Column(Integer)
    upload_date = Column(DateTime, default=datetime.utcnow)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="files")
    
    shared_with = relationship("DataAccessPermission", back_populates="file", cascade="all, delete-orphan")
