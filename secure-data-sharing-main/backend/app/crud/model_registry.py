# app/crud/model_registry.py
from sqlalchemy.orm import Session
from app.models.model_registry import ModelRegistry
from app.schemas.model_registry import ModelRegistryCreate

def create_model(db: Session, model: ModelRegistryCreate, owner_id: int, model_path: str): # ✅ ADDED model_path
    """
    Save a new trained model into the registry.
    """
    db_model = ModelRegistry(
        name=model.name,
        accuracy=model.accuracy,
        owner_id=owner_id,
        model_path=model_path # ✅ ADDED THIS LINE
    )
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

def get_models_by_user(db: Session, owner_id: int):
    """
    Fetch all models belonging to a specific user.
    """
    return db.query(ModelRegistry).filter(ModelRegistry.owner_id == owner_id).all()

def get_model_by_id(db: Session, model_id: int):
    """
    Fetch a specific model by its ID.
    """
    return db.query(ModelRegistry).filter(ModelRegistry.id == model_id).first()

def delete_model(db: Session, model_id: int):
    """
    Delete a model from the registry by its ID.
    """
    db_model = db.query(ModelRegistry).filter(ModelRegistry.id == model_id).first()
    if db_model:
        db.delete(db_model)
        db.commit()
    return db_model