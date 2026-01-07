# Test Federated Learning Implementation
import requests
import numpy as np
import time

SERVER_URL = "http://localhost:8000"
FL_ENDPOINT = f"{SERVER_URL}/federated"

def test_federated_learning():
    """Test the federated learning implementation."""
    
    print("="*60)
    print("FEDERATED LEARNING TEST")
    print("="*60)
    
    # 1. Initialize the global model
    print("\n[1] Initializing global model...")
    response = requests.post(
        f"{FL_ENDPOINT}/init",
        json={"num_features": 10}
    )
    assert response.status_code == 200
    init_result = response.json()
    print(f"    Status: {init_result['status']}")
    print(f"    Features: {init_result['num_features']}")
    
    # 2. Check server status
    print("\n[2] Checking server status...")
    response = requests.get(f"{FL_ENDPOINT}/status")
    assert response.status_code == 200
    status = response.json()
    print(f"    Current round: {status['current_round']}")
    print(f"    Registered clients: {status['registered_clients']}")
    
    # 3. Register clients
    print("\n[3] Registering clients...")
    clients = ["client_A", "client_B", "client_C"]
    for client_id in clients:
        response = requests.post(
            f"{FL_ENDPOINT}/register",
            json={"client_id": client_id, "metadata": {"test": True}}
        )
        assert response.status_code == 200
        print(f"    Registered: {client_id}")
    
    # 4. Get global model
    print("\n[4] Getting global model...")
    response = requests.get(f"{FL_ENDPOINT}/model")
    assert response.status_code == 200
    model = response.json()
    print(f"    Round: {model['round']}")
    print(f"    Features: {model['num_features']}")
    print(f"    Bias: {model['bias']:.6f}")
    
    # 5. Start a training round
    print("\n[5] Starting training round...")
    response = requests.post(f"{FL_ENDPOINT}/round/start")
    assert response.status_code == 200
    start_result = response.json()
    print(f"    Status: {start_result['status']}")
    print(f"    Round: {start_result.get('round', 'N/A')}")
    
    # 6. Submit client updates (simulating local training)
    print("\n[6] Submitting client updates...")
    for i, client_id in enumerate(clients):
        # Simulate different local model updates
        np.random.seed(i)
        weights = (np.random.randn(10) * 0.1).tolist()
        bias = float(np.random.randn() * 0.1)
        num_samples = 100 + i * 50
        local_accuracy = 0.75 + i * 0.05
        
        response = requests.post(
            f"{FL_ENDPOINT}/update",
            json={
                "client_id": client_id,
                "weights": weights,
                "bias": bias,
                "num_samples": num_samples,
                "local_accuracy": local_accuracy
            }
        )
        assert response.status_code == 200
        result = response.json()
        print(f"    {client_id}: samples={num_samples}, accuracy={local_accuracy:.2f}")
    
    # 7. Aggregate the round
    print("\n[7] Aggregating round...")
    response = requests.post(f"{FL_ENDPOINT}/round/aggregate")
    assert response.status_code == 200
    agg_result = response.json()
    print(f"    Status: {agg_result['status']}")
    print(f"    Round: {agg_result['round']}")
    print(f"    Clients: {agg_result['aggregation_result']['num_clients']}")
    print(f"    Total samples: {agg_result['aggregation_result']['total_samples']}")
    print(f"    Avg accuracy: {agg_result['aggregation_result']['avg_local_accuracy']:.4f}")
    
    # 8. Get training history
    print("\n[8] Getting training history...")
    response = requests.get(f"{FL_ENDPOINT}/history")
    assert response.status_code == 200
    history = response.json()
    print(f"    Rounds completed: {len(history['history'])}")
    
    # 9. Test predictions
    print("\n[9] Testing predictions...")
    test_data = np.random.randn(5, 10).tolist()
    response = requests.post(
        f"{FL_ENDPOINT}/predict",
        json={"data": test_data}
    )
    assert response.status_code == 200
    predictions = response.json()
    print(f"    Predictions: {predictions['predictions']}")
    print(f"    Probabilities: {[f'{p:.4f}' for p in predictions['probabilities']]}")
    
    # 10. Cleanup - unregister clients
    print("\n[10] Unregistering clients...")
    for client_id in clients:
        response = requests.delete(f"{FL_ENDPOINT}/unregister/{client_id}")
        assert response.status_code == 200
        print(f"    Unregistered: {client_id}")
    
    print("\n" + "="*60)
    print("ALL TESTS PASSED!")
    print("="*60)


if __name__ == "__main__":
    test_federated_learning()
