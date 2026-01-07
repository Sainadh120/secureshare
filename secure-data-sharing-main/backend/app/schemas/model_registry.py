from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ModelRegistryBase(BaseModel):
    name: str
    accuracy: Optional[float] = None


class ModelRegistryCreate(ModelRegistryBase):
    pass


class ModelRegistryResponse(ModelRegistryBase):
    id: int
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True  # ✅ Pydantic v2 replacement for orm_mode
