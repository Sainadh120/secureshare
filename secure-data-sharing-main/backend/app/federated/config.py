# Federated Learning Configuration

# Model Configuration
NUM_FEATURES = 10  # Number of features for Logistic Regression
LEARNING_RATE = 0.01
MAX_ITERATIONS = 100

# Federated Learning Configuration
MIN_CLIENTS_FOR_ROUND = 2  # Minimum clients needed to start aggregation
MAX_ROUNDS = 50  # Maximum number of federated rounds
CLIENT_TIMEOUT_SECONDS = 300  # Timeout for client updates

# Aggregation Configuration
AGGREGATION_STRATEGY = "fedavg"  # fedavg, weighted_fedavg
