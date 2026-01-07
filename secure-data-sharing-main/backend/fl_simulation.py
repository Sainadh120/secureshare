# Multi-Client Federated Learning Simulation
# Simulates multiple clients with different local datasets

import numpy as np
import requests
import time
from typing import List, Tuple
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

SERVER_URL = "http://localhost:8000"
FL_ENDPOINT = f"{SERVER_URL}/federated"


class SimulatedClient:
    """Simulated FL client for testing."""
    
    def __init__(self, client_id: str, X_train: np.ndarray, y_train: np.ndarray,
                 X_test: np.ndarray, y_test: np.ndarray):
        self.client_id = client_id
        self.X_train = X_train
        self.y_train = y_train
        self.X_test = X_test
        self.y_test = y_test
        self.model = None
    
    def initialize_model(self, weights: List[float], bias: float):
        """Initialize local model with global weights."""
        num_features = len(weights)
        
        # Create and fit a dummy model to initialize
        self.model = LogisticRegression(warm_start=True, max_iter=100)
        dummy_X = np.zeros((2, num_features))
        dummy_X[0, 0] = 1
        dummy_y = np.array([0, 1])
        self.model.fit(dummy_X, dummy_y)
        
        # Set global weights
        self.model.coef_ = np.array([weights])
        self.model.intercept_ = np.array([bias])
    
    def train_local(self, epochs: int = 1) -> Tuple[List[float], float, float]:
        """Train locally and return updated weights."""
        self.model.max_iter = epochs * 100
        self.model.fit(self.X_train, self.y_train)
        
        # Get updated weights
        weights = self.model.coef_[0].tolist()
        bias = float(self.model.intercept_[0])
        
        # Evaluate
        predictions = self.model.predict(self.X_test)
        accuracy = accuracy_score(self.y_test, predictions)
        
        return weights, bias, accuracy
    
    def evaluate_global(self, weights: List[float], bias: float) -> float:
        """Evaluate global model on local test data."""
        self.initialize_model(weights, bias)
        predictions = self.model.predict(self.X_test)
        return accuracy_score(self.y_test, predictions)


def create_heterogeneous_data(num_clients: int, samples_per_client: int,
                               num_features: int, heterogeneity: float = 0.3
                               ) -> List[Tuple[np.ndarray, np.ndarray]]:
    """
    Create heterogeneous data for multiple clients.
    Different clients have slightly different data distributions.
    """
    datasets = []
    
    # True underlying weights
    true_weights = np.random.randn(num_features)
    
    for i in range(num_clients):
        # Add heterogeneity to each client's data distribution
        np.random.seed(i * 100)
        client_shift = np.random.randn(num_features) * heterogeneity
        
        # Generate data
        X = np.random.randn(samples_per_client, num_features) + client_shift
        
        # Labels based on true weights plus some noise
        z = np.dot(X, true_weights)
        probs = 1 / (1 + np.exp(-z))
        y = (probs + np.random.randn(samples_per_client) * 0.1 > 0.5).astype(int)
        
        datasets.append((X, y))
    
    return datasets


def run_federated_simulation(num_clients: int = 5, num_rounds: int = 10,
                              num_features: int = 10, samples_per_client: int = 200):
    """Run a complete federated learning simulation."""
    
    print("="*70)
    print("FEDERATED LEARNING SIMULATION")
    print("="*70)
    print(f"Clients: {num_clients}")
    print(f"Rounds: {num_rounds}")
    print(f"Features: {num_features}")
    print(f"Samples per client: {samples_per_client}")
    print("="*70)
    
    # Step 1: Initialize server
    print("\n[SETUP] Initializing FL server...")
    response = requests.post(f"{FL_ENDPOINT}/init", json={"num_features": num_features})
    if response.status_code != 200:
        print(f"Failed to initialize server: {response.text}")
        return
    print("Server initialized.")
    
    # Step 2: Create client data (non-IID)
    print("\n[SETUP] Creating heterogeneous client data...")
    datasets = create_heterogeneous_data(num_clients, samples_per_client, num_features)
    
    # Step 3: Create and register clients
    clients = []
    for i in range(num_clients):
        client_id = f"client_{i+1}"
        X, y = datasets[i]
        
        # Split into train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=i
        )
        
        # Create client
        client = SimulatedClient(client_id, X_train, y_train, X_test, y_test)
        clients.append(client)
        
        # Register with server
        response = requests.post(
            f"{FL_ENDPOINT}/register",
            json={"client_id": client_id}
        )
        print(f"Registered {client_id}: {len(X_train)} train, {len(X_test)} test samples")
    
    # Track metrics
    round_metrics = []
    
    # Step 4: Run federated rounds
    print("\n" + "="*70)
    print("STARTING FEDERATED TRAINING")
    print("="*70)
    
    for round_num in range(1, num_rounds + 1):
        print(f"\n--- Round {round_num}/{num_rounds} ---")
        
        # Start round
        response = requests.post(f"{FL_ENDPOINT}/round/start")
        if response.status_code != 200:
            print(f"Failed to start round: {response.text}")
            continue
        
        round_data = response.json()
        global_weights = round_data["global_model"]["weights"]
        global_bias = round_data["global_model"]["bias"]
        
        # Each client trains locally
        local_accuracies = []
        for client in clients:
            # Initialize with global model
            client.initialize_model(global_weights, global_bias)
            
            # Train locally
            weights, bias, accuracy = client.train_local(epochs=1)
            local_accuracies.append(accuracy)
            
            # Submit update
            response = requests.post(
                f"{FL_ENDPOINT}/update",
                json={
                    "client_id": client.client_id,
                    "weights": weights,
                    "bias": bias,
                    "num_samples": len(client.X_train),
                    "local_accuracy": accuracy
                }
            )
        
        # Aggregate
        response = requests.post(f"{FL_ENDPOINT}/round/aggregate")
        if response.status_code != 200:
            print(f"Failed to aggregate: {response.text}")
            continue
        
        agg_result = response.json()
        new_global_weights = agg_result["global_model"]["weights"]
        new_global_bias = agg_result["global_model"]["bias"]
        
        # Evaluate global model on each client's test data
        global_accuracies = []
        for client in clients:
            acc = client.evaluate_global(new_global_weights, new_global_bias)
            global_accuracies.append(acc)
        
        avg_local = np.mean(local_accuracies)
        avg_global = np.mean(global_accuracies)
        
        round_metrics.append({
            "round": round_num,
            "avg_local_accuracy": avg_local,
            "avg_global_accuracy": avg_global
        })
        
        print(f"  Avg Local Accuracy:  {avg_local:.4f}")
        print(f"  Avg Global Accuracy: {avg_global:.4f}")
    
    # Final summary
    print("\n" + "="*70)
    print("TRAINING COMPLETE")
    print("="*70)
    
    print("\nRound-by-Round Metrics:")
    print("-"*50)
    print(f"{'Round':<8} {'Local Acc':<15} {'Global Acc':<15}")
    print("-"*50)
    for m in round_metrics:
        print(f"{m['round']:<8} {m['avg_local_accuracy']:<15.4f} {m['avg_global_accuracy']:<15.4f}")
    
    # Get final model
    response = requests.get(f"{FL_ENDPOINT}/model")
    final_model = response.json()
    
    print("\nFinal Global Model:")
    print(f"  Round: {final_model['round']}")
    print(f"  Bias: {final_model['bias']:.6f}")
    
    # Cleanup
    for client in clients:
        requests.delete(f"{FL_ENDPOINT}/unregister/{client.client_id}")
    
    print("\n" + "="*70)
    print("SIMULATION COMPLETE")
    print("="*70)
    
    return round_metrics


if __name__ == "__main__":
    # Run simulation with different configurations
    run_federated_simulation(
        num_clients=5,
        num_rounds=10,
        num_features=10,
        samples_per_client=200
    )
