"""
FGSM (Fast Gradient Sign Method) Defense Demo
=============================================

This script demonstrates:
1. How FGSM adversarial attacks work
2. How to defend against them using adversarial training
3. Comparison between normal and defended models

FGSM Attack Formula:
    x_adv = x + ε * sign(∇x J(θ, x, y))
    
Where:
- x_adv = adversarial example
- x = original input
- ε (epsilon) = perturbation magnitude
- ∇x J = gradient of loss with respect to input
- sign() = sign function (-1, 0, or 1)
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np


class SimpleModel(nn.Module):
    """
    Simple neural network for binary classification.
    Used to demonstrate adversarial attacks and defense.
    """
    def __init__(self, input_dim=2, hidden_dim=16):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.network(x)


def fgsm_attack(model, x, y, epsilon=0.1):
    """
    Fast Gradient Sign Method (FGSM) Attack
    
    Creates adversarial examples by adding perturbations in the direction
    of the gradient of the loss with respect to the input.
    
    Args:
        model: The neural network model to attack
        x: Original input tensor
        y: True labels
        epsilon: Perturbation magnitude (higher = stronger attack)
    
    Returns:
        x_adv: Adversarial examples
    """
    # Clone input and enable gradient computation
    x_adv = x.clone().detach().requires_grad_(True)
    
    # Forward pass
    output = model(x_adv)
    loss = nn.BCELoss()(output, y)
    
    # Backward pass to compute gradients
    model.zero_grad()
    loss.backward()
    
    # Create adversarial examples using the sign of gradients
    perturbation = epsilon * x_adv.grad.sign()
    x_adv = x_adv + perturbation
    
    return x_adv.detach()


def train_normal_model(model, x, y, epochs=200, lr=0.01):
    """
    Train a model normally without adversarial examples.
    """
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    for epoch in range(epochs):
        optimizer.zero_grad()
        output = model(x)
        loss = nn.BCELoss()(output, y)
        loss.backward()
        optimizer.step()
        
        if (epoch + 1) % 50 == 0:
            print(f"  Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")
    
    return model


def train_with_adversarial_defense(model, x, y, epochs=200, lr=0.01, epsilon=0.1):
    """
    Train a model with adversarial training (defense mechanism).
    
    The model is trained on both clean and adversarial examples,
    making it robust against FGSM attacks.
    """
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    for epoch in range(epochs):
        optimizer.zero_grad()
        
        # Train on clean examples
        output_clean = model(x)
        loss_clean = nn.BCELoss()(output_clean, y)
        
        # Generate adversarial examples
        x_adv = fgsm_attack(model, x, y, epsilon)
        
        # Train on adversarial examples
        output_adv = model(x_adv)
        loss_adv = nn.BCELoss()(output_adv, y)
        
        # Combined loss (50% clean, 50% adversarial)
        total_loss = 0.5 * loss_clean + 0.5 * loss_adv
        total_loss.backward()
        optimizer.step()
        
        if (epoch + 1) % 50 == 0:
            print(f"  Epoch {epoch+1}/{epochs}, Clean Loss: {loss_clean.item():.4f}, Adv Loss: {loss_adv.item():.4f}")
    
    return model


def evaluate_model(model, x, y, epsilon=0.1):
    """
    Evaluate model accuracy on clean and adversarial examples.
    """
    model.eval()
    with torch.no_grad():
        # Clean accuracy
        output_clean = model(x)
        pred_clean = (output_clean > 0.5).float()
        acc_clean = (pred_clean == y).float().mean().item()
    
    # Adversarial accuracy (need gradients for attack)
    model.train()
    x_adv = fgsm_attack(model, x, y, epsilon)
    model.eval()
    with torch.no_grad():
        output_adv = model(x_adv)
        pred_adv = (output_adv > 0.5).float()
        acc_adv = (pred_adv == y).float().mean().item()
    
    return acc_clean, acc_adv


def run_demo():
    """
    Main demo function showing FGSM attack and defense.
    """
    print("=" * 60)
    print("  FGSM (Fast Gradient Sign Method) Defense Demo")
    print("=" * 60)
    
    # Set random seed for reproducibility
    torch.manual_seed(42)
    np.random.seed(42)
    
    # Generate synthetic dataset
    print("\n📊 Generating synthetic dataset...")
    n_samples = 500
    x = torch.rand((n_samples, 2)) * 2 - 1  # Range [-1, 1]
    y = ((x[:, 0] ** 2 + x[:, 1] ** 2) < 0.5).float().unsqueeze(1)  # Circle classification
    print(f"   Dataset: {n_samples} samples, 2 features")
    print(f"   Class distribution: {y.sum().int().item()} positive, {len(y) - y.sum().int().item()} negative")
    
    # Test different epsilon values
    epsilon = 0.15
    print(f"\n⚔️  Attack strength (epsilon): {epsilon}")
    
    # Train normal model
    print("\n" + "-" * 60)
    print("🔵 Training NORMAL model (no defense)...")
    print("-" * 60)
    normal_model = SimpleModel()
    train_normal_model(normal_model, x, y, epochs=200)
    
    # Train defended model
    print("\n" + "-" * 60)
    print("🛡️  Training DEFENDED model (adversarial training)...")
    print("-" * 60)
    defended_model = SimpleModel()
    train_with_adversarial_defense(defended_model, x, y, epochs=200, epsilon=epsilon)
    
    # Evaluate both models
    print("\n" + "=" * 60)
    print("  📈 RESULTS")
    print("=" * 60)
    
    clean_acc_normal, adv_acc_normal = evaluate_model(normal_model, x, y, epsilon)
    clean_acc_defended, adv_acc_defended = evaluate_model(defended_model, x, y, epsilon)
    
    print("\n┌────────────────────┬──────────────┬──────────────────┐")
    print("│      Model         │ Clean Acc    │ Under Attack     │")
    print("├────────────────────┼──────────────┼──────────────────┤")
    print(f"│ Normal Model       │   {clean_acc_normal*100:5.1f}%     │     {adv_acc_normal*100:5.1f}%        │")
    print(f"│ Defended Model     │   {clean_acc_defended*100:5.1f}%     │     {adv_acc_defended*100:5.1f}%        │")
    print("└────────────────────┴──────────────┴──────────────────┘")
    
    # Analysis
    print("\n📋 Analysis:")
    print(f"   • Normal model drops from {clean_acc_normal*100:.1f}% to {adv_acc_normal*100:.1f}% under attack")
    print(f"     (Accuracy drop: {(clean_acc_normal - adv_acc_normal)*100:.1f}%)")
    print(f"   • Defended model drops from {clean_acc_defended*100:.1f}% to {adv_acc_defended*100:.1f}% under attack")
    print(f"     (Accuracy drop: {(clean_acc_defended - adv_acc_defended)*100:.1f}%)")
    
    if adv_acc_defended > adv_acc_normal:
        improvement = (adv_acc_defended - adv_acc_normal) * 100
        print(f"\n✅ Adversarial training improved robustness by {improvement:.1f}%!")
    
    print("\n" + "=" * 60)
    print("  Demo completed successfully!")
    print("=" * 60)
    
    return {
        "normal_model": {
            "clean_accuracy": clean_acc_normal,
            "adversarial_accuracy": adv_acc_normal
        },
        "defended_model": {
            "clean_accuracy": clean_acc_defended,
            "adversarial_accuracy": adv_acc_defended
        }
    }


if __name__ == "__main__":
    results = run_demo()
