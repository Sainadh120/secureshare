# Federated Learning Client
# This is the client-side code that runs on each participating client.
# Each client trains locally and sends only model updates to the server.

import numpy as np
import requests
from typing import Optional, List, Tuple
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
import json


class FederatedClient:
    """
    Federated Learning Client for Logistic Regression.
    Handles local training and communication with FL server.
    """
    
    def __init__(self, client_id: str, server_url: str = "http://localhost:8000"):
        """
        Initialize the federated client.
        
        Args:
            client_id: Unique identifier for this client
            server_url: URL of the federated learning server
        """
        self.client_id = client_id
        self.server_url = server_url.rstrip("/")
        self.fl_endpoint = f"{self.server_url}/federated"
        
        # Local model
        self.model: Optional[LogisticRegression] = None
        self.scaler: Optional[StandardScaler] = None
        
        # Local data (never sent to server)
        self.X_train: Optional[np.ndarray] = None
        self.y_train: Optional[np.ndarray] = None
        self.X_test: Optional[np.ndarray] = None
        self.y_test: Optional[np.ndarray] = None
        
        # Model parameters from server
        self.num_features: Optional[int] = None
        self.current_round: int = 0
        
        # Registration status
        self.is_registered: bool = False
    
    def register(self, metadata: Optional[dict] = None) -> dict:
        """Register this client with the FL server."""
        response = requests.post(
            f"{self.fl_endpoint}/register",
            json={"client_id": self.client_id, "metadata": metadata}
        )
        response.raise_for_status()
        result = response.json()
        self.is_registered = True
        self.current_round = result.get("current_round", 0)
        return result
    
    def unregister(self) -> dict:
        """Unregister this client from the FL server."""
        response = requests.delete(f"{self.fl_endpoint}/unregister/{self.client_id}")
        response.raise_for_status()
        self.is_registered = False
        return response.json()
    
    def get_global_model(self) -> dict:
        """Fetch the current global model from the server."""
        response = requests.get(f"{self.fl_endpoint}/model")
        response.raise_for_status()
        model_data = response.json()
        
        # Update local state
        self.num_features = model_data["num_features"]
        self.current_round = model_data["round"]
        
        # Initialize local model with global parameters
        self._initialize_model_from_global(model_data)
        
        return model_data
    
    def _initialize_model_from_global(self, model_data: dict) -> None:
        """Initialize local Logistic Regression with global model parameters."""
        self.model = LogisticRegression(
            warm_start=True,
            max_iter=100,
            solver='lbfgs'
        )
        
        # Set the model parameters from global model
        # LogisticRegression needs to be "fitted" first to have coef_ and intercept_
        # We'll do a dummy fit and then override
        num_features = model_data["num_features"]
        
        # Create dummy data for initialization
        dummy_X = np.zeros((2, num_features))
        dummy_X[0, 0] = 1
        dummy_y = np.array([0, 1])
        
        # Fit on dummy data
        self.model.fit(dummy_X, dummy_y)
        
        # Override with global model parameters
        self.model.coef_ = np.array([model_data["weights"]])
        self.model.intercept_ = np.array([model_data["bias"]])
    
    def set_local_data(self, X_train: np.ndarray, y_train: np.ndarray,
                       X_test: Optional[np.ndarray] = None, 
                       y_test: Optional[np.ndarray] = None) -> None:
        """
        Set the local training and test data.
        This data NEVER leaves the client.
        
        Args:
            X_train: Training features
            y_train: Training labels
            X_test: Optional test features
            y_test: Optional test labels
        """
        self.X_train = np.array(X_train)
        self.y_train = np.array(y_train)
        
        if X_test is not None:
            self.X_test = np.array(X_test)
        if y_test is not None:
            self.y_test = np.array(y_test)
        
        # Update num_features if not set
        if self.num_features is None:
            self.num_features = self.X_train.shape[1]
    
    def train_local(self, epochs: int = 1) -> Tuple[List[float], float, float]:
        """
        Train the model locally on client's data.
        
        Args:
            epochs: Number of local training epochs
            
        Returns:
            Tuple of (weights, bias, local_accuracy)
        """
        if self.X_train is None or self.y_train is None:
            raise ValueError("Local data not set. Call set_local_data first.")
        
        if self.model is None:
            raise ValueError("Model not initialized. Call get_global_model first.")
        
        # Train locally
        self.model.max_iter = epochs * 100  # Increase iterations for more epochs
        self.model.fit(self.X_train, self.y_train)
        
        # Get updated parameters
        weights = self.model.coef_[0].tolist()
        bias = float(self.model.intercept_[0])
        
        # Calculate local accuracy
        local_accuracy = self._evaluate_local()
        
        return weights, bias, local_accuracy
    
    def _evaluate_local(self) -> float:
        """Evaluate model on local test data or training data."""
        if self.X_test is not None and self.y_test is not None:
            predictions = self.model.predict(self.X_test)
            return accuracy_score(self.y_test, predictions)
        else:
            predictions = self.model.predict(self.X_train)
            return accuracy_score(self.y_train, predictions)
    
    def submit_update(self, weights: List[float], bias: float, 
                      local_accuracy: Optional[float] = None) -> dict:
        """
        Submit model update to the FL server.
        Only model weights are sent, NOT the data.
        
        Args:
            weights: Updated model weights
            bias: Updated model bias
            local_accuracy: Optional local accuracy metric
        """
        if self.X_train is None:
            raise ValueError("Local data not set")
        
        payload = {
            "client_id": self.client_id,
            "weights": weights,
            "bias": bias,
            "num_samples": len(self.X_train),
            "local_accuracy": local_accuracy
        }
        
        response = requests.post(f"{self.fl_endpoint}/update", json=payload)
        response.raise_for_status()
        return response.json()
    
    def participate_in_round(self, epochs: int = 1) -> dict:
        """
        Complete participation in a federated learning round.
        1. Get global model
        2. Train locally
        3. Submit update
        
        Args:
            epochs: Number of local training epochs
            
        Returns:
            Result of the update submission
        """
        # Step 1: Get global model
        self.get_global_model()
        
        # Step 2: Train locally (data stays local)
        weights, bias, local_accuracy = self.train_local(epochs)
        
        # Step 3: Submit only the model update (not the data)
        result = self.submit_update(weights, bias, local_accuracy)
        
        print(f"[Client {self.client_id}] Round {self.current_round}: "
              f"Local accuracy = {local_accuracy:.4f}, "
              f"Samples = {len(self.X_train)}")
        
        return result
    
    def get_server_status(self) -> dict:
        """Get the current status of the FL server."""
        response = requests.get(f"{self.fl_endpoint}/status")
        response.raise_for_status()
        return response.json()
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions using the local model."""
        if self.model is None:
            raise ValueError("Model not initialized")
        return self.model.predict(X)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Get prediction probabilities using the local model."""
        if self.model is None:
            raise ValueError("Model not initialized")
        return self.model.predict_proba(X)[:, 1]


# --- Utility Functions for Running Clients ---

def create_sample_data(num_samples: int, num_features: int, 
                       random_seed: int = None) -> Tuple[np.ndarray, np.ndarray]:
    """
    Create sample data for testing federated learning.
    In production, each client would use their own local data.
    """
    if random_seed is not None:
        np.random.seed(random_seed)
    
    X = np.random.randn(num_samples, num_features)
    # Create labels based on a simple rule
    true_weights = np.random.randn(num_features)
    y = (np.dot(X, true_weights) > 0).astype(int)
    
    return X, y


def run_federated_round(clients: List[FederatedClient], epochs: int = 1) -> None:
    """
    Run a complete federated learning round with multiple clients.
    
    Args:
        clients: List of FederatedClient instances
        epochs: Number of local training epochs per client
    """
    print(f"\n{'='*50}")
    print(f"Starting Federated Learning Round")
    print(f"{'='*50}")
    
    # Each client participates
    for client in clients:
        try:
            result = client.participate_in_round(epochs)
            print(f"  Client {client.client_id}: {result['status']}")
        except Exception as e:
            print(f"  Client {client.client_id}: Error - {str(e)}")
    
    print(f"{'='*50}\n")


# --- Example Usage Script ---

if __name__ == "__main__":
    """
    Example of running federated learning with multiple clients.
    Run this after starting the FastAPI server.
    """
    import time
    
    SERVER_URL = "http://localhost:8000"
    NUM_FEATURES = 10
    NUM_CLIENTS = 3
    NUM_ROUNDS = 5
    
    # Step 1: Initialize the server model
    print("Initializing server model...")
    response = requests.post(
        f"{SERVER_URL}/federated/init",
        json={"num_features": NUM_FEATURES}
    )
    print(f"Server initialized: {response.json()}")
    
    # Step 2: Create clients
    clients = []
    for i in range(NUM_CLIENTS):
        client = FederatedClient(
            client_id=f"client_{i+1}",
            server_url=SERVER_URL
        )
        
        # Register client
        client.register(metadata={"location": f"region_{i+1}"})
        
        # Create local data (each client has different data)
        X, y = create_sample_data(
            num_samples=100 + i * 50,  # Different data sizes
            num_features=NUM_FEATURES,
            random_seed=i * 42
        )
        
        # Split into train/test
        split_idx = int(len(X) * 0.8)
        client.set_local_data(
            X_train=X[:split_idx],
            y_train=y[:split_idx],
            X_test=X[split_idx:],
            y_test=y[split_idx:]
        )
        
        clients.append(client)
        print(f"Created {client.client_id} with {len(client.X_train)} training samples")
    
    # Step 3: Run federated learning rounds
    for round_num in range(NUM_ROUNDS):
        print(f"\n{'#'*50}")
        print(f"# FEDERATED ROUND {round_num + 1}")
        print(f"{'#'*50}")
        
        # Start the round
        response = requests.post(f"{SERVER_URL}/federated/round/start")
        start_result = response.json()
        print(f"Round started: {start_result.get('status', 'unknown')}")
        
        if start_result.get("status") == "error":
            print(f"Error: {start_result.get('message')}")
            break
        
        # Each client trains and submits
        run_federated_round(clients, epochs=1)
        
        # Aggregate the round
        response = requests.post(f"{SERVER_URL}/federated/round/aggregate")
        agg_result = response.json()
        print(f"Aggregation result: {agg_result.get('status', 'unknown')}")
        if "aggregation_result" in agg_result:
            print(f"  - Clients: {agg_result['aggregation_result']['num_clients']}")
            print(f"  - Total samples: {agg_result['aggregation_result']['total_samples']}")
            if agg_result['aggregation_result'].get('avg_local_accuracy'):
                print(f"  - Avg local accuracy: {agg_result['aggregation_result']['avg_local_accuracy']:.4f}")
        
        time.sleep(0.5)  # Small delay between rounds
    
    # Step 4: Get final model and training history
    print("\n" + "="*50)
    print("FINAL RESULTS")
    print("="*50)
    
    response = requests.get(f"{SERVER_URL}/federated/history")
    history = response.json()
    print(f"\nTraining History ({len(history['history'])} rounds):")
    for item in history['history']:
        print(f"  Round {item['round']}: {item['num_clients']} clients, "
              f"{item['total_samples']} samples, "
              f"avg accuracy: {item.get('avg_local_accuracy', 'N/A')}")
    
    response = requests.get(f"{SERVER_URL}/federated/model")
    final_model = response.json()
    print(f"\nFinal Global Model:")
    print(f"  - Round: {final_model['round']}")
    print(f"  - Features: {final_model['num_features']}")
    print(f"  - Bias: {final_model['bias']:.6f}")
    
    # Cleanup
    for client in clients:
        client.unregister()
    
    print("\nFederated learning completed!")
