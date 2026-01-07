# Federated Learning Pydantic Schemas
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# --- Client Registration ---
class ClientRegisterRequest(BaseModel):
    client_id: str = Field(..., description="Unique client identifier")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Optional client metadata")


class ClientRegisterResponse(BaseModel):
    client_id: str
    status: str
    current_round: int


# --- Model Distribution ---
class GlobalModelResponse(BaseModel):
    weights: List[float]
    bias: float
    round: int
    num_features: int


# --- Client Updates ---
class ClientUpdateRequest(BaseModel):
    client_id: str = Field(..., description="Unique client identifier")
    weights: List[float] = Field(..., description="Updated model weights")
    bias: float = Field(..., description="Updated model bias")
    num_samples: int = Field(..., ge=1, description="Number of training samples")
    local_accuracy: Optional[float] = Field(default=None, ge=0, le=1, description="Local model accuracy")


class ClientUpdateResponse(BaseModel):
    status: str
    client_id: str
    round: int
    updates_received: int


# --- Aggregation ---
class AggregationResult(BaseModel):
    weights: List[float]
    bias: float
    total_samples: int
    num_clients: int
    avg_local_accuracy: Optional[float]


class RoundCompleteResponse(BaseModel):
    status: str
    round: int
    aggregation_result: Optional[AggregationResult]
    global_model: GlobalModelResponse


# --- Server Status ---
class ServerStatusResponse(BaseModel):
    is_training: bool
    current_round: int
    max_rounds: int
    registered_clients: int
    min_clients_required: int
    pending_updates: int
    training_history_length: int


# --- Training History ---
class RoundHistoryItem(BaseModel):
    round: int
    num_clients: int
    total_samples: int
    avg_local_accuracy: Optional[float]
    completed_at: str


class TrainingHistoryResponse(BaseModel):
    history: List[RoundHistoryItem]


# --- Prediction ---
class PredictionRequest(BaseModel):
    data: List[List[float]] = Field(..., description="2D array of feature vectors")


class PredictionResponse(BaseModel):
    predictions: List[int]
    probabilities: List[float]


# --- Round Management ---
class StartRoundRequest(BaseModel):
    force: bool = Field(default=False, description="Force start even with minimum clients")


class StartRoundResponse(BaseModel):
    status: str
    round: Optional[int] = None
    message: Optional[str] = None
    global_model: Optional[GlobalModelResponse] = None
    registered_clients: Optional[int] = None


# --- Model Initialization ---
class InitModelRequest(BaseModel):
    num_features: int = Field(..., ge=1, description="Number of features for the model")
    weights: Optional[List[float]] = Field(default=None, description="Initial weights (optional)")
    bias: Optional[float] = Field(default=None, description="Initial bias (optional)")


class InitModelResponse(BaseModel):
    status: str
    num_features: int
    global_model: GlobalModelResponse
