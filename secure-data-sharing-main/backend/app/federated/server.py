# Federated Learning Server
import numpy as np
import pickle
import os
from typing import Dict, List, Optional
from datetime import datetime
from .aggregator import FedAvgAggregator, ClientUpdate
from .config import NUM_FEATURES, MIN_CLIENTS_FOR_ROUND, MAX_ROUNDS


class FederatedServer:
    """
    Federated Learning Server for coordinating distributed training.
    Manages global model, client registration, and aggregation rounds.
    """
    
    def __init__(self, num_features: int = NUM_FEATURES, model_dir: str = "saved_models"):
        self.num_features = num_features
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        
        # Global model parameters (Logistic Regression)
        self.global_weights: np.ndarray = np.zeros(num_features)
        self.global_bias: float = 0.0
        
        # Round management
        self.current_round: int = 0
        self.max_rounds: int = MAX_ROUNDS
        self.min_clients: int = MIN_CLIENTS_FOR_ROUND
        
        # Client tracking
        self.registered_clients: Dict[str, dict] = {}
        self.round_participants: Dict[int, List[str]] = {}
        
        # Aggregator
        self.aggregator = FedAvgAggregator()
        
        # Training history
        self.training_history: List[dict] = []
        
        # Status
        self.is_training: bool = False
        self.round_start_time: Optional[datetime] = None
    
    def initialize_global_model(self, weights: Optional[np.ndarray] = None, bias: Optional[float] = None) -> None:
        """Initialize or reset the global model."""
        if weights is not None:
            self.global_weights = np.array(weights)
        else:
            # Random initialization
            self.global_weights = np.random.randn(self.num_features) * 0.01
        
        self.global_bias = bias if bias is not None else 0.0
        self.current_round = 0
        self.training_history = []
    
    def register_client(self, client_id: str, metadata: Optional[dict] = None) -> dict:
        """Register a new client for federated learning."""
        self.registered_clients[client_id] = {
            "registered_at": datetime.utcnow().isoformat(),
            "metadata": metadata or {},
            "rounds_participated": 0,
            "last_update": None
        }
        return {
            "client_id": client_id,
            "status": "registered",
            "current_round": self.current_round
        }
    
    def unregister_client(self, client_id: str) -> bool:
        """Remove a client from the federation."""
        if client_id in self.registered_clients:
            del self.registered_clients[client_id]
            return True
        return False
    
    def get_global_model(self) -> dict:
        """Return the current global model parameters."""
        return {
            "weights": self.global_weights.tolist(),
            "bias": float(self.global_bias),
            "round": self.current_round,
            "num_features": self.num_features
        }
    
    def start_round(self) -> dict:
        """Start a new federated learning round."""
        if len(self.registered_clients) < self.min_clients:
            return {
                "status": "error",
                "message": f"Need at least {self.min_clients} clients to start a round",
                "registered_clients": len(self.registered_clients)
            }
        
        self.current_round += 1
        self.is_training = True
        self.round_start_time = datetime.utcnow()
        self.round_participants[self.current_round] = []
        self.aggregator.clear_updates()
        
        return {
            "status": "round_started",
            "round": self.current_round,
            "global_model": self.get_global_model()
        }
    
    def submit_update(self, client_id: str, weights: List[float], bias: float, 
                      num_samples: int, local_accuracy: Optional[float] = None) -> dict:
        """
        Receive and store a model update from a client.
        
        Args:
            client_id: Unique identifier for the client
            weights: Updated model weights from local training
            bias: Updated model bias from local training
            num_samples: Number of training samples used
            local_accuracy: Optional local model accuracy
        """
        if client_id not in self.registered_clients:
            return {"status": "error", "message": "Client not registered"}
        
        if not self.is_training:
            return {"status": "error", "message": "No active training round"}
        
        # Create client update
        update = ClientUpdate(
            client_id=client_id,
            weights=np.array(weights),
            bias=bias,
            num_samples=num_samples,
            round_number=self.current_round,
            local_accuracy=local_accuracy
        )
        
        # Add to aggregator
        self.aggregator.add_client_update(update)
        
        # Track participation
        if client_id not in self.round_participants.get(self.current_round, []):
            self.round_participants[self.current_round].append(client_id)
        
        # Update client info
        self.registered_clients[client_id]["rounds_participated"] += 1
        self.registered_clients[client_id]["last_update"] = datetime.utcnow().isoformat()
        
        return {
            "status": "update_received",
            "client_id": client_id,
            "round": self.current_round,
            "updates_received": self.aggregator.get_num_updates()
        }
    
    def aggregate_round(self) -> dict:
        """
        Aggregate all client updates and update the global model.
        Called when all expected updates are received or timeout.
        """
        if not self.is_training:
            return {"status": "error", "message": "No active training round"}
        
        num_updates = self.aggregator.get_num_updates()
        if num_updates < self.min_clients:
            return {
                "status": "waiting",
                "message": f"Waiting for more updates. Have {num_updates}, need {self.min_clients}",
                "updates_received": num_updates
            }
        
        # Perform aggregation
        aggregation_result = self.aggregator.aggregate()
        
        # Update global model
        self.global_weights = np.array(aggregation_result["weights"])
        self.global_bias = aggregation_result["bias"]
        
        # Record history
        round_record = {
            "round": self.current_round,
            "num_clients": aggregation_result["num_clients"],
            "total_samples": aggregation_result["total_samples"],
            "avg_local_accuracy": aggregation_result.get("avg_local_accuracy"),
            "completed_at": datetime.utcnow().isoformat()
        }
        self.training_history.append(round_record)
        
        # Clear updates for next round
        self.aggregator.clear_updates()
        self.is_training = False
        
        # Save global model
        self._save_global_model()
        
        return {
            "status": "round_completed",
            "round": self.current_round,
            "aggregation_result": aggregation_result,
            "global_model": self.get_global_model()
        }
    
    def _save_global_model(self) -> str:
        """Save the current global model to disk."""
        model_data = {
            "weights": self.global_weights,
            "bias": self.global_bias,
            "round": self.current_round,
            "num_features": self.num_features,
            "saved_at": datetime.utcnow().isoformat()
        }
        
        filepath = os.path.join(self.model_dir, f"federated_global_model_round_{self.current_round}.pkl")
        with open(filepath, "wb") as f:
            pickle.dump(model_data, f)
        
        # Also save as latest
        latest_path = os.path.join(self.model_dir, "federated_global_model_latest.pkl")
        with open(latest_path, "wb") as f:
            pickle.dump(model_data, f)
        
        return filepath
    
    def load_global_model(self, filepath: Optional[str] = None) -> dict:
        """Load a global model from disk."""
        if filepath is None:
            filepath = os.path.join(self.model_dir, "federated_global_model_latest.pkl")
        
        if not os.path.exists(filepath):
            return {"status": "error", "message": "Model file not found"}
        
        with open(filepath, "rb") as f:
            model_data = pickle.load(f)
        
        self.global_weights = model_data["weights"]
        self.global_bias = model_data["bias"]
        self.current_round = model_data.get("round", 0)
        self.num_features = model_data.get("num_features", self.num_features)
        
        return {
            "status": "loaded",
            "round": self.current_round,
            "global_model": self.get_global_model()
        }
    
    def get_status(self) -> dict:
        """Get the current status of the federated learning server."""
        return {
            "is_training": self.is_training,
            "current_round": self.current_round,
            "max_rounds": self.max_rounds,
            "registered_clients": len(self.registered_clients),
            "min_clients_required": self.min_clients,
            "pending_updates": self.aggregator.get_num_updates() if self.is_training else 0,
            "training_history_length": len(self.training_history)
        }
    
    def get_training_history(self) -> List[dict]:
        """Get the full training history."""
        return self.training_history
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions using the global model."""
        z = np.dot(X, self.global_weights) + self.global_bias
        probabilities = 1 / (1 + np.exp(-z))
        return (probabilities >= 0.5).astype(int)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Get prediction probabilities using the global model."""
        z = np.dot(X, self.global_weights) + self.global_bias
        return 1 / (1 + np.exp(-z))


# Global server instance
_federated_server: Optional[FederatedServer] = None


def get_federated_server(num_features: int = NUM_FEATURES) -> FederatedServer:
    """Get or create the global federated server instance."""
    global _federated_server
    if _federated_server is None:
        _federated_server = FederatedServer(num_features=num_features)
    return _federated_server


def reset_federated_server(num_features: int = NUM_FEATURES) -> FederatedServer:
    """Reset the federated server (for testing or reinitialization)."""
    global _federated_server
    _federated_server = FederatedServer(num_features=num_features)
    return _federated_server
