# Federated Learning Module

## Overview

Federated Learning implementation using Logistic Regression with FedAvg aggregation.

**Key Principle**: Client data NEVER leaves the client. Only model weights are shared.

## File Structure

```
backend/
├── app/
│   ├── federated/
│   │   ├── __init__.py          # Module exports
│   │   ├── config.py            # FL configuration
│   │   ├── aggregator.py        # FedAvg aggregation logic
│   │   └── server.py            # FL server coordinator
│   ├── api/endpoints/
│   │   └── federated.py         # REST API endpoints
│   └── schemas/
│       └── federated.py         # Pydantic schemas
├── fl_client.py                 # Client-side training code
├── fl_simulation.py             # Multi-client simulation
└── test_federated.py            # Test script
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Global Model                                │   │
│  │            (weights, bias, round)                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            │                                        │
│            ┌───────────────┼───────────────┐                       │
│            │               │               │                       │
│            ▼               ▼               ▼                       │
└────────────────────────────────────────────────────────────────────┘
             │               │               │
    ┌────────┴───────┐ ┌────┴────┐ ┌───────┴────────┐
    │   CLIENT A     │ │ CLIENT B │ │   CLIENT C     │
    │                │ │          │ │                │
    │ Local Data     │ │Local Data│ │ Local Data     │
    │ (STAYS HERE)   │ │(STAYS)   │ │ (STAYS HERE)   │
    │                │ │          │ │                │
    │ ┌────────────┐ │ │┌────────┐│ │ ┌────────────┐ │
    │ │Train Model │ │ ││ Train  ││ │ │Train Model │ │
    │ │  Locally   │ │ ││ Model  ││ │ │  Locally   │ │
    │ └────────────┘ │ │└────────┘│ │ └────────────┘ │
    │       │        │ │    │     │ │       │        │
    │       ▼        │ │    ▼     │ │       ▼        │
    │  Send ONLY:    │ │  ONLY:   │ │  Send ONLY:    │
    │  - weights     │ │- weights │ │  - weights     │
    │  - bias        │ │- bias    │ │  - bias        │
    │  - num_samples │ │- samples │ │  - num_samples │
    └────────────────┘ └──────────┘ └────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/federated/init` | Initialize global model |
| GET | `/federated/status` | Get server status |
| POST | `/federated/register` | Register client |
| DELETE | `/federated/unregister/{client_id}` | Unregister client |
| GET | `/federated/model` | Get global model |
| POST | `/federated/round/start` | Start training round |
| POST | `/federated/update` | Submit client update |
| POST | `/federated/round/aggregate` | Aggregate updates |
| GET | `/federated/history` | Get training history |
| POST | `/federated/predict` | Make predictions |
| GET | `/federated/clients` | List registered clients |

## Usage

### 1. Start the Server

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 2. Run the Test

```bash
python test_federated.py
```

### 3. Run Multi-Client Simulation

```bash
python fl_simulation.py
```

### 4. Use the Client Library

```python
from fl_client import FederatedClient
import numpy as np

# Create client
client = FederatedClient("my_client", "http://localhost:8000")

# Register
client.register()

# Set local data (NEVER sent to server)
client.set_local_data(X_train, y_train, X_test, y_test)

# Participate in a round
result = client.participate_in_round(epochs=1)
```

## Federated Learning Round Flow

1. **Server**: Initialize global model
2. **Clients**: Register with server
3. **Server**: Start new round
4. **Server**: Send global model to clients
5. **Clients**: Train locally on their data
6. **Clients**: Send weight updates (NOT data)
7. **Server**: Aggregate updates (FedAvg)
8. **Server**: Update global model
9. Repeat from step 3

## Configuration

Edit `app/federated/config.py`:

```python
NUM_FEATURES = 10           # Number of features
MIN_CLIENTS_FOR_ROUND = 2   # Minimum clients to start
MAX_ROUNDS = 50             # Maximum rounds
```

## Privacy Guarantee

- Client data is stored only on the client
- Only model weights are transmitted
- Server never sees raw data
- FedAvg aggregation combines weights
