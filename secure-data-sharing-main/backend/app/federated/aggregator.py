# Federated Averaging Aggregator
import numpy as np
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class ClientUpdate:
    """Represents a model update from a client."""
    client_id: str
    weights: np.ndarray  # Coefficients
    bias: float  # Intercept
    num_samples: int  # Number of training samples
    round_number: int
    local_accuracy: Optional[float] = None


class FedAvgAggregator:
    """
    Federated Averaging (FedAvg) Aggregator for Logistic Regression.
    Aggregates client model updates using weighted averaging.
    """
    
    def __init__(self):
        self.client_updates: Dict[str, ClientUpdate] = {}
    
    def add_client_update(self, update: ClientUpdate) -> None:
        """Add a client update for the current round."""
        self.client_updates[update.client_id] = update
    
    def clear_updates(self) -> None:
        """Clear all client updates after aggregation."""
        self.client_updates.clear()
    
    def get_num_updates(self) -> int:
        """Get the number of client updates received."""
        return len(self.client_updates)
    
    def aggregate(self) -> Dict[str, any]:
        """
        Perform FedAvg aggregation on all client updates.
        
        Returns:
            Dict containing aggregated weights and bias.
        """
        if not self.client_updates:
            raise ValueError("No client updates to aggregate")
        
        updates = list(self.client_updates.values())
        
        # Calculate total samples across all clients
        total_samples = sum(u.num_samples for u in updates)
        
        if total_samples == 0:
            raise ValueError("Total samples cannot be zero")
        
        # Get shape from first update
        weight_shape = updates[0].weights.shape
        
        # Initialize aggregated values
        aggregated_weights = np.zeros(weight_shape)
        aggregated_bias = 0.0
        
        # Weighted average based on number of samples
        for update in updates:
            weight_factor = update.num_samples / total_samples
            aggregated_weights += weight_factor * update.weights
            aggregated_bias += weight_factor * update.bias
        
        # Calculate average local accuracy
        accuracies = [u.local_accuracy for u in updates if u.local_accuracy is not None]
        avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else None
        
        return {
            "weights": aggregated_weights.tolist(),
            "bias": float(aggregated_bias),
            "total_samples": total_samples,
            "num_clients": len(updates),
            "avg_local_accuracy": avg_accuracy
        }
    
    def aggregate_simple(self) -> Dict[str, any]:
        """
        Perform simple averaging (equal weight per client).
        
        Returns:
            Dict containing aggregated weights and bias.
        """
        if not self.client_updates:
            raise ValueError("No client updates to aggregate")
        
        updates = list(self.client_updates.values())
        num_clients = len(updates)
        
        # Get shape from first update
        weight_shape = updates[0].weights.shape
        
        # Simple average
        aggregated_weights = np.zeros(weight_shape)
        aggregated_bias = 0.0
        
        for update in updates:
            aggregated_weights += update.weights / num_clients
            aggregated_bias += update.bias / num_clients
        
        return {
            "weights": aggregated_weights.tolist(),
            "bias": float(aggregated_bias),
            "num_clients": num_clients
        }
