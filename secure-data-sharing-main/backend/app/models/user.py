from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # Combining fields from your recent code and previous versions for completeness
    full_name = Column(String, index=True, nullable=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    public_key = Column(Text, nullable=True)
    private_key = Column(Text, nullable=True)  # Store encrypted private key for server-side operations
    is_active = Column(Boolean, default=True)


    # --- RELATIONSHIP TO FILES (This was missing) ---
    # This line is required by your FileRecord model.
    files = relationship(
        "FileRecord", 
        back_populates="owner", 
        cascade="all, delete-orphan"
    )

    # --- RELATIONSHIP TO MODELS (From your code) ---
    # This relationship connects the user to their ML models.
    models = relationship(
        "ModelRegistry", 
        back_populates="owner", 
        cascade="all, delete"
    )

