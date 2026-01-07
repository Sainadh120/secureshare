# Federated Learning API Endpoints
from fastapi import APIRouter, HTTPException, status
from typing import List
import numpy as np

from app.federated.server import get_federated_server, reset_federated_server
from app.schemas.federated import (
    ClientRegisterRequest, ClientRegisterResponse,
    GlobalModelResponse, 
    ClientUpdateRequest, ClientUpdateResponse,
    RoundCompleteResponse, AggregationResult,
    ServerStatusResponse,
    TrainingHistoryResponse, RoundHistoryItem,
    PredictionRequest, PredictionResponse,
    StartRoundRequest, StartRoundResponse,
    InitModelRequest, InitModelResponse
)

router = APIRouter()


# --- Server Status ---
@router.get("/status", response_model=ServerStatusResponse, summary="Get FL Server Status")
def get_server_status():
    """Get the current status of the federated learning server."""
    server = get_federated_server()
    status_data = server.get_status()
    return ServerStatusResponse(**status_data)


# --- Model Initialization ---
@router.post("/init", response_model=InitModelResponse, summary="Initialize Global Model")
def initialize_model(request: InitModelRequest):
    """Initialize or reset the global model with specified number of features."""
    server = reset_federated_server(num_features=request.num_features)
    
    if request.weights is not None:
        if len(request.weights) != request.num_features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Weights length ({len(request.weights)}) must match num_features ({request.num_features})"
            )
        server.initialize_global_model(
            weights=np.array(request.weights),
            bias=request.bias
        )
    else:
        server.initialize_global_model()
    
    return InitModelResponse(
        status="initialized",
        num_features=request.num_features,
        global_model=GlobalModelResponse(**server.get_global_model())
    )


# --- Client Registration ---
@router.post("/register", response_model=ClientRegisterResponse, summary="Register Client")
def register_client(request: ClientRegisterRequest):
    """Register a new client for federated learning."""
    server = get_federated_server()
    result = server.register_client(request.client_id, request.metadata)
    return ClientRegisterResponse(**result)


@router.delete("/unregister/{client_id}", summary="Unregister Client")
def unregister_client(client_id: str):
    """Remove a client from the federation."""
    server = get_federated_server()
    success = server.unregister_client(client_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client {client_id} not found"
        )
    return {"status": "unregistered", "client_id": client_id}


# --- Global Model Distribution ---
@router.get("/model", response_model=GlobalModelResponse, summary="Get Global Model")
def get_global_model():
    """Get the current global model parameters."""
    server = get_federated_server()
    return GlobalModelResponse(**server.get_global_model())


# --- Round Management ---
@router.post("/round/start", response_model=StartRoundResponse, summary="Start Training Round")
def start_training_round(request: StartRoundRequest = StartRoundRequest()):
    """Start a new federated learning round."""
    server = get_federated_server()
    result = server.start_round()
    
    if result["status"] == "error":
        return StartRoundResponse(
            status=result["status"],
            message=result.get("message"),
            registered_clients=result.get("registered_clients")
        )
    
    return StartRoundResponse(
        status=result["status"],
        round=result["round"],
        global_model=GlobalModelResponse(**result["global_model"])
    )


@router.post("/round/aggregate", response_model=RoundCompleteResponse, summary="Aggregate Round")
def aggregate_round():
    """Aggregate all client updates and update the global model."""
    server = get_federated_server()
    result = server.aggregate_round()
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    if result["status"] == "waiting":
        raise HTTPException(
            status_code=status.HTTP_425_TOO_EARLY,
            detail=result["message"]
        )
    
    return RoundCompleteResponse(
        status=result["status"],
        round=result["round"],
        aggregation_result=AggregationResult(**result["aggregation_result"]),
        global_model=GlobalModelResponse(**result["global_model"])
    )


# --- Client Updates ---
@router.post("/update", response_model=ClientUpdateResponse, summary="Submit Model Update")
def submit_model_update(request: ClientUpdateRequest):
    """Submit a model update from a client."""
    server = get_federated_server()
    
    # Validate weights length
    expected_features = server.num_features
    if len(request.weights) != expected_features:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Weights length ({len(request.weights)}) must match num_features ({expected_features})"
        )
    
    result = server.submit_update(
        client_id=request.client_id,
        weights=request.weights,
        bias=request.bias,
        num_samples=request.num_samples,
        local_accuracy=request.local_accuracy
    )
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return ClientUpdateResponse(**result)


# --- Training History ---
@router.get("/history", response_model=TrainingHistoryResponse, summary="Get Training History")
def get_training_history():
    """Get the full training history."""
    server = get_federated_server()
    history = server.get_training_history()
    return TrainingHistoryResponse(
        history=[RoundHistoryItem(**item) for item in history]
    )


# --- Prediction ---
@router.post("/predict", response_model=PredictionResponse, summary="Make Predictions")
def make_predictions(request: PredictionRequest):
    """Make predictions using the current global model."""
    server = get_federated_server()
    
    try:
        X = np.array(request.data)
        if X.ndim == 1:
            X = X.reshape(1, -1)
        
        if X.shape[1] != server.num_features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Feature count ({X.shape[1]}) must match model features ({server.num_features})"
            )
        
        predictions = server.predict(X)
        probabilities = server.predict_proba(X)
        
        return PredictionResponse(
            predictions=predictions.tolist(),
            probabilities=probabilities.tolist()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# --- Model Persistence ---
@router.post("/model/save", summary="Save Global Model")
def save_model():
    """Manually save the current global model."""
    server = get_federated_server()
    filepath = server._save_global_model()
    return {"status": "saved", "filepath": filepath}


@router.post("/model/load", summary="Load Global Model")
def load_model(filepath: str = None):
    """Load a global model from disk."""
    server = get_federated_server()
    result = server.load_global_model(filepath)
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    
    return result


# --- Registered Clients ---
@router.get("/clients", summary="Get Registered Clients")
def get_registered_clients():
    """Get list of all registered clients."""
    server = get_federated_server()
    return {
        "clients": list(server.registered_clients.keys()),
        "count": len(server.registered_clients),
        "details": server.registered_clients
    }
