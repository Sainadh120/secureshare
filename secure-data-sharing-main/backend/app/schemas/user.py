from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str
    public_key: str | None = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        orm_mode = True

class UserPublicKey(BaseModel):
    public_key: str

class UserSearch(BaseModel):
    id: int
    username: str
    has_public_key: bool
