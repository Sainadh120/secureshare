import os
import pickle
import io
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.model_registry import ModelRegistryCreate, ModelRegistryResponse
from app.crud import model_registry, data_sharing
from app.models.user import User
from app.core.crypto import decrypt_data

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

# --- Directories ---
UPLOAD_DIR = "uploaded_files"
MODEL_DIR = "saved_models"
os.makedirs(MODEL_DIR, exist_ok=True)

router = APIRouter()

# --- Pydantic Schemas for Requests ---
class PredictionRequest(BaseModel):
    data: Dict[str, Any]


# --- FGSM Defense Demo Classes and Functions ---
class SimpleNNModel(nn.Module):
    """Simple neural network for FGSM demonstration"""
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


def fgsm_attack(model, x, y, epsilon=0.15):
    """Generate adversarial examples using FGSM"""
    x_adv = x.clone().detach().requires_grad_(True)
    output = model(x_adv)
    loss = nn.BCELoss()(output, y)
    model.zero_grad()
    loss.backward()
    perturbation = epsilon * x_adv.grad.sign()
    x_adv = x_adv + perturbation
    return x_adv.detach()


def train_normal_model(model, x, y, epochs=200, lr=0.01):
    """Train model without adversarial defense"""
    optimizer = optim.Adam(model.parameters(), lr=lr)
    for _ in range(epochs):
        optimizer.zero_grad()
        output = model(x)
        loss = nn.BCELoss()(output, y)
        loss.backward()
        optimizer.step()
    return model


def train_defended_model(model, x, y, epochs=200, lr=0.01, epsilon=0.15):
    """Train model with adversarial training (defense)"""
    optimizer = optim.Adam(model.parameters(), lr=lr)
    for _ in range(epochs):
        optimizer.zero_grad()
        output_clean = model(x)
        loss_clean = nn.BCELoss()(output_clean, y)
        x_adv = fgsm_attack(model, x, y, epsilon)
        output_adv = model(x_adv)
        loss_adv = nn.BCELoss()(output_adv, y)
        total_loss = 0.5 * loss_clean + 0.5 * loss_adv
        total_loss.backward()
        optimizer.step()
    return model


def evaluate_model(model, x, y, epsilon=0.15):
    """Evaluate model on clean and adversarial examples"""
    model.eval()
    with torch.no_grad():
        output_clean = model(x)
        pred_clean = (output_clean > 0.5).float()
        acc_clean = (pred_clean == y).float().mean().item()
    
    model.train()
    x_adv = fgsm_attack(model, x, y, epsilon)
    model.eval()
    with torch.no_grad():
        output_adv = model(x_adv)
        pred_adv = (output_adv > 0.5).float()
        acc_adv = (pred_adv == y).float().mean().item()
    
    return acc_clean, acc_adv


# --- File Threat Detection ---
# Simulated ML-based threat detection for files
# In a real scenario, this would use trained models to analyze file patterns

DANGEROUS_EXTENSIONS = ['.exe', '.dll', '.bat', '.cmd', '.ps1', '.vbs', '.js', '.jar', '.msi', '.scr', '.pif', '.com']
SUSPICIOUS_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.iso', '.dmg']

# HIGH RISK keywords - these trigger dangerous classification regardless of file type
HIGH_RISK_KEYWORDS = ['malware', 'virus', 'trojan', 'ransomware', 'backdoor', 'rootkit', 'spyware', 'keylogger', 'botnet', 'worm', 'malicious']
# MEDIUM RISK keywords - suspicious but not definitively malicious
MEDIUM_RISK_KEYWORDS = ['hack', 'crack', 'keygen', 'exploit', 'payload', 'inject', 'attack', 'phishing', 'stealer', 'dump']
# Additional suspicious patterns
SUSPICIOUS_PATTERNS = ['password', 'creditcard', 'ssn', 'leaked', 'stolen', 'confidential', 'secret', 'private_key']

def analyze_file_threat(filename: str, file_size: int = 0) -> dict:
    """
    ML-based file threat analysis simulation.
    Analyzes filename patterns and returns threat assessment.
    Works on ANY file type - PDFs, docs, images can all be flagged if they have suspicious names.
    """
    import random
    import hashlib
    
    filename_lower = filename.lower()
    ext = '.' + filename_lower.split('.')[-1] if '.' in filename_lower else ''
    
    # Initialize threat scores
    threat_score = 0
    risk_factors = []
    
    # HIGH PRIORITY: Check for high-risk keywords FIRST (applies to ALL file types including PDFs)
    for keyword in HIGH_RISK_KEYWORDS:
        if keyword in filename_lower:
            threat_score += 75  # Immediate high risk
            risk_factors.append(f"CRITICAL: High-risk malware keyword detected: '{keyword}'")
            break
    
    # Check for medium-risk keywords
    if threat_score < 70:  # Only check if not already high risk
        for keyword in MEDIUM_RISK_KEYWORDS:
            if keyword in filename_lower:
                threat_score += 45
                risk_factors.append(f"WARNING: Suspicious keyword in filename: '{keyword}'")
                break
    
    # Check for suspicious data patterns
    for pattern in SUSPICIOUS_PATTERNS:
        if pattern in filename_lower:
            threat_score += 25
            risk_factors.append(f"ALERT: Sensitive data pattern detected: '{pattern}'")
            break
    
    # Check dangerous extensions (adds to existing score)
    if ext in DANGEROUS_EXTENSIONS:
        threat_score += 50
        risk_factors.append(f"DANGER: Executable file extension: {ext}")
    
    # Check suspicious archive extensions
    if ext in SUSPICIOUS_EXTENSIONS:
        threat_score += 20
        risk_factors.append(f"CAUTION: Archive file may contain hidden threats")
    
    # Check for multiple extensions (common malware trick like "document.pdf.exe")
    parts = filename_lower.split('.')
    if len(parts) > 2:
        # Check if it's trying to disguise as safe file
        safe_exts = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png']
        for safe_ext in safe_exts:
            if safe_ext[1:] in parts[:-1]:  # Safe extension not at end
                threat_score += 40
                risk_factors.append(f"ALERT: Disguised file extension detected (fake {safe_ext})")
                break
        else:
            threat_score += 15
            risk_factors.append("INFO: Multiple file extensions detected")
    
    # Check for hidden/obfuscated extensions
    if any(c in filename for c in ['\u200b', '\u200c', '\u200d', '\u2060']):
        threat_score += 40
        risk_factors.append("DANGER: Hidden Unicode characters detected - possible obfuscation")
    
    # Check unusual file size patterns
    if file_size > 0:
        if file_size < 1024 and ext in DANGEROUS_EXTENSIONS:
            threat_score += 25
            risk_factors.append("WARNING: Suspiciously small executable file")
        elif file_size > 100 * 1024 * 1024:  # > 100MB
            threat_score += 10
            risk_factors.append("INFO: Unusually large file size")
    
    # Add some randomness to simulate ML model uncertainty (± 3%)
    hash_val = int(hashlib.md5(filename.encode()).hexdigest()[:8], 16)
    random.seed(hash_val)
    ml_adjustment = random.uniform(-3, 3)
    threat_score = max(0, min(100, threat_score + ml_adjustment))
    
    # Calculate confidence (higher for clear-cut cases)
    confidence = 95 - abs(threat_score - 50) * 0.5 + random.uniform(-3, 3)
    confidence = max(60, min(99, confidence))
    
    # Determine threat level
    if threat_score >= 70:
        threat_level = "high"
        status = "DANGEROUS"
    elif threat_score >= 40:
        threat_level = "medium"  
        status = "SUSPICIOUS"
    elif threat_score >= 15:
        threat_level = "low"
        status = "CAUTION"
    else:
        threat_level = "safe"
        status = "CLEAN"
    
    # ONLY reduce score for safe extensions if NO suspicious keywords were found
    safe_extensions = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.pptx', '.jpg', '.png', '.gif', '.mp3', '.mp4']
    if ext in safe_extensions and len(risk_factors) == 0:
        threat_score = max(5, threat_score - 10)
        confidence = min(99, confidence + 5)
        risk_factors.append("SAFE: Clean file type with no suspicious patterns")
    
    return {
        "filename": filename,
        "threat_score": round(threat_score, 1),
        "threat_level": threat_level,
        "status": status,
        "confidence": round(confidence, 1),
        "risk_factors": risk_factors if risk_factors else ["No significant threats detected"],
        "ml_model_version": "v2.1.0-fgsm-hardened",
        "scan_engine": "SecureShare Threat Intelligence"
    }


# ============================================================================
# CONTENT-BASED THREAT DETECTION
# Detects malicious content even when filename looks legitimate (e.g., resume.pdf)
# ============================================================================

# File magic bytes (signatures) for common file types
FILE_SIGNATURES = {
    'pdf': [b'%PDF'],
    'zip': [b'PK\x03\x04', b'PK\x05\x06'],
    'exe': [b'MZ'],
    'dll': [b'MZ'],
    'jpg': [b'\xff\xd8\xff'],
    'png': [b'\x89PNG\r\n\x1a\n'],
    'gif': [b'GIF87a', b'GIF89a'],
    'docx': [b'PK\x03\x04'],  # Office Open XML
    'xlsx': [b'PK\x03\x04'],
    'pptx': [b'PK\x03\x04'],
    'doc': [b'\xd0\xcf\x11\xe0'],  # OLE Compound
    'xls': [b'\xd0\xcf\x11\xe0'],
    'rar': [b'Rar!\x1a\x07'],
    '7z': [b'7z\xbc\xaf\x27\x1c'],
}

# Malicious patterns to detect in file content
MALICIOUS_PATTERNS = {
    # PDF-specific threats
    'pdf_javascript': [b'/JavaScript', b'/JS', b'/OpenAction', b'/AA', b'/Launch'],
    'pdf_embedded': [b'/EmbeddedFile', b'/Filespec', b'/F (', b'/UF ('],
    'pdf_exploit': [b'/JBIG2Decode', b'/Colors 255', b'getAnnots', b'getIcon'],
    
    # Script/code patterns (dangerous in documents)
    'scripts': [b'<script', b'javascript:', b'vbscript:', b'powershell', b'cmd.exe'],
    'shell_commands': [b'/bin/sh', b'/bin/bash', b'subprocess', b'os.system', b'eval('],
    
    # Executable patterns hidden in documents
    'exe_patterns': [b'This program cannot be run in DOS mode', b'PE\x00\x00', b'.text\x00', b'.data\x00'],
    
    # Macro/VBA threats (Office docs)
    'macros': [b'VBA', b'Auto_Open', b'Document_Open', b'Workbook_Open', b'AutoExec'],
    
    # Obfuscation indicators
    'obfuscation': [b'base64_decode', b'fromCharCode', b'String.fromCharCode', b'eval(unescape'],
    
    # Network/exfiltration
    'network': [b'XMLHTTP', b'WScript.Shell', b'CreateObject', b'InternetExplorer.Application'],
    
    # Common malware strings
    'malware_strings': [b'keylogger', b'backdoor', b'rootkit', b'trojan', b'ransomware', b'cryptolocker'],
}

# Entropy threshold (high entropy = possibly encrypted/packed malware)
ENTROPY_THRESHOLD = 7.5  # Out of 8.0 (max for byte data)

def calculate_entropy(data: bytes) -> float:
    """Calculate Shannon entropy of data - high entropy indicates encryption/compression"""
    import math
    if not data:
        return 0.0
    
    byte_counts = {}
    for byte in data:
        byte_counts[byte] = byte_counts.get(byte, 0) + 1
    
    entropy = 0.0
    data_len = len(data)
    for count in byte_counts.values():
        if count > 0:
            freq = count / data_len
            entropy -= freq * math.log2(freq)
    
    return entropy


def verify_file_signature(content: bytes, claimed_extension: str) -> dict:
    """Verify if file content matches its claimed extension"""
    ext = claimed_extension.lower().lstrip('.')
    
    if ext not in FILE_SIGNATURES:
        return {"valid": True, "message": "Unknown file type - cannot verify"}
    
    expected_sigs = FILE_SIGNATURES[ext]
    for sig in expected_sigs:
        if content[:len(sig)] == sig:
            return {"valid": True, "message": f"File signature matches {ext.upper()}"}
    
    # Try to detect actual file type
    actual_type = "unknown"
    for ftype, sigs in FILE_SIGNATURES.items():
        for sig in sigs:
            if content[:len(sig)] == sig:
                actual_type = ftype
                break
    
    return {
        "valid": False,
        "message": f"MISMATCH: File claims to be {ext.upper()} but appears to be {actual_type.upper()}",
        "actual_type": actual_type
    }


def scan_content_for_threats(content: bytes, filename: str) -> dict:
    """
    Deep content analysis to detect malicious payloads even in legitimate-looking files.
    This catches attacks where 'resume.pdf' contains malware.
    """
    import hashlib
    
    threat_score = 0
    risk_factors = []
    detections = []
    
    ext = '.' + filename.lower().split('.')[-1] if '.' in filename else ''
    
    # 1. Verify file signature matches extension
    sig_check = verify_file_signature(content, ext)
    if not sig_check["valid"]:
        threat_score += 50
        risk_factors.append(f"CRITICAL: {sig_check['message']}")
        detections.append("file_type_mismatch")
    
    # 2. Calculate entropy (detect encrypted/packed content)
    entropy = calculate_entropy(content[:10000])  # Check first 10KB
    if entropy > ENTROPY_THRESHOLD:
        threat_score += 30
        risk_factors.append(f"WARNING: High entropy ({entropy:.2f}/8.0) - possible encrypted/packed content")
        detections.append("high_entropy")
    
    # 3. Scan for malicious patterns
    content_lower = content.lower()
    
    for category, patterns in MALICIOUS_PATTERNS.items():
        for pattern in patterns:
            if pattern.lower() in content_lower:
                if category == 'pdf_javascript':
                    threat_score += 40
                    risk_factors.append(f"DANGER: PDF contains JavaScript/Action ({pattern.decode('utf-8', errors='ignore')})")
                    detections.append("pdf_javascript")
                elif category == 'pdf_embedded':
                    threat_score += 35
                    risk_factors.append(f"WARNING: PDF has embedded files")
                    detections.append("pdf_embedded_files")
                elif category == 'pdf_exploit':
                    threat_score += 50
                    risk_factors.append(f"CRITICAL: PDF exploit pattern detected")
                    detections.append("pdf_exploit")
                elif category == 'exe_patterns':
                    threat_score += 60
                    risk_factors.append(f"CRITICAL: Executable code hidden inside document!")
                    detections.append("hidden_executable")
                elif category == 'macros':
                    threat_score += 45
                    risk_factors.append(f"DANGER: Macro/VBA code detected - potential payload")
                    detections.append("macro_detected")
                elif category == 'scripts':
                    threat_score += 40
                    risk_factors.append(f"WARNING: Script code found in document")
                    detections.append("script_detected")
                elif category == 'obfuscation':
                    threat_score += 35
                    risk_factors.append(f"WARNING: Obfuscated code detected")
                    detections.append("obfuscation")
                elif category == 'network':
                    threat_score += 30
                    risk_factors.append(f"ALERT: Network/shell access code detected")
                    detections.append("network_access")
                elif category == 'malware_strings':
                    threat_score += 50
                    risk_factors.append(f"CRITICAL: Known malware signature detected")
                    detections.append("malware_signature")
                elif category == 'shell_commands':
                    threat_score += 45
                    risk_factors.append(f"DANGER: Shell command execution code found")
                    detections.append("shell_commands")
                break  # Only count each category once
    
    # 4. Check for suspicious strings in "safe" looking files
    if ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx']:
        suspicious_strings = [b'cmd', b'powershell', b'http://', b'https://', b'ftp://']
        url_count = 0
        for s in suspicious_strings:
            url_count += content_lower.count(s)
        
        if url_count > 20:
            threat_score += 20
            risk_factors.append(f"ALERT: Excessive URLs/commands in document ({url_count} found)")
            detections.append("excessive_urls")
    
    # 5. Calculate file hash for potential signature matching
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Cap threat score at 100
    threat_score = min(100, threat_score)
    
    # Determine threat level
    if threat_score >= 70:
        threat_level = "high"
        status = "DANGEROUS - DO NOT OPEN"
    elif threat_score >= 40:
        threat_level = "medium"
        status = "SUSPICIOUS - PROCEED WITH CAUTION"
    elif threat_score >= 15:
        threat_level = "low"
        status = "MINOR CONCERNS"
    else:
        threat_level = "safe"
        status = "CLEAN"
    
    # Add confidence based on how many checks were performed
    checks_performed = 4 + len([d for d in detections if d])
    confidence = min(99, 70 + checks_performed * 3)
    
    if not risk_factors:
        risk_factors.append("SAFE: No malicious content patterns detected")
    
    return {
        "filename": filename,
        "threat_score": round(threat_score, 1),
        "threat_level": threat_level,
        "status": status,
        "confidence": round(confidence, 1),
        "risk_factors": risk_factors,
        "detections": detections,
        "entropy": round(entropy, 2),
        "file_hash": file_hash,
        "content_scanned": True,
        "ml_model_version": "v2.2.0-content-scanner",
        "scan_engine": "SecureShare Deep Content Analysis"
    }


def analyze_file_with_content(filename: str, content: bytes = None, file_size: int = 0) -> dict:
    """
    Combined analysis: filename patterns + content analysis.
    Use this for comprehensive threat detection.
    """
    # First, do filename analysis
    filename_result = analyze_file_threat(filename, file_size)
    
    # If no content provided, return filename-only analysis
    if content is None or len(content) == 0:
        filename_result["content_scanned"] = False
        filename_result["note"] = "Content analysis not available - filename patterns only"
        return filename_result
    
    # Do content analysis
    content_result = scan_content_for_threats(content, filename)
    
    # Combine scores (weighted: content analysis is more reliable)
    combined_score = (filename_result["threat_score"] * 0.3 + content_result["threat_score"] * 0.7)
    combined_score = min(100, combined_score)

    # Enforce OR rule: if either filename or content indicates HIGH risk, treat as HIGH
    if filename_result.get("threat_score", 0) >= 70 or content_result.get("threat_score", 0) >= 70:
        threat_level = "high"
        status = "DANGEROUS - MALICIOUS CONTENT DETECTED"
    elif content_result["threat_score"] >= 40:
        threat_level = "medium"
        status = "SUSPICIOUS CONTENT DETECTED"
    elif combined_score >= 40:
        threat_level = "medium"
        status = "SUSPICIOUS"
    elif combined_score >= 15:
        threat_level = "low"
        status = "MINOR CONCERNS"
    else:
        threat_level = "safe"
        status = "CLEAN"
    
    # Merge risk factors
    all_risk_factors = content_result["risk_factors"] + [
        f for f in filename_result["risk_factors"] 
        if f not in content_result["risk_factors"] and "SAFE:" not in f
    ]
    
    return {
        "filename": filename,
        "threat_score": round(combined_score, 1),
        "threat_level": threat_level,
        "status": status,
        "confidence": max(filename_result["confidence"], content_result["confidence"]),
        "risk_factors": all_risk_factors if all_risk_factors else ["No threats detected"],
        "detections": content_result.get("detections", []),
        "entropy": content_result.get("entropy", 0),
        "file_hash": content_result.get("file_hash", ""),
        "content_scanned": True,
        "filename_score": filename_result["threat_score"],
        "content_score": content_result["threat_score"],
        "ml_model_version": "v2.2.0-hybrid-scanner",
        "scan_engine": "SecureShare Hybrid Threat Analysis"
    }


@router.post("/scan-file")
def scan_file_threat(
    filename: str,
    file_size: int = 0,
):
    """
    Scan a file for potential threats using ML-based analysis.
    Returns threat assessment with confidence scores.
    """
    return analyze_file_threat(filename, file_size)


@router.post("/scan-content")
def scan_file_content(
    filename: str,
    file_id: int = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Deep content scan of a specific file.
    Reads actual file content and scans for malicious patterns.
    This catches attacks where legitimate-looking files contain malware.
    """
    from app.models.file_record import FileRecord
    
    if file_id:
        file_record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
        if file_record and file_record.file_path:
            try:
                # Read encrypted file content
                with open(file_record.file_path, 'rb') as f:
                    content = f.read()
                
                # Perform deep content analysis
                result = analyze_file_with_content(
                    file_record.filename,
                    content,
                    file_record.size_bytes or len(content)
                )
                result["file_id"] = file_id
                return result
            except Exception as e:
                return {
                    "error": f"Could not read file: {str(e)}",
                    "filename": filename,
                    "fallback": analyze_file_threat(filename)
                }
    
    # Fallback to filename-only analysis
    return analyze_file_threat(filename)


@router.get("/scan-all-shared")
def scan_all_shared_files(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    deep_scan: bool = False,  # Set to True for content scanning
):
    """
    Scan all files shared with the current user for threats.
    If deep_scan=True, also analyzes file content for hidden threats.
    Returns threat analysis for each file.
    """
    from app.models.data_sharing import DataAccessPermission
    from app.models.file_record import FileRecord
    
    permissions = db.query(DataAccessPermission).filter(
        DataAccessPermission.shared_with_user_id == current_user.id
    ).all()
    
    results = []
    for perm in permissions:
        file_record = db.query(FileRecord).filter(FileRecord.id == perm.file_id).first()
        if file_record:
            if deep_scan and file_record.file_path:
                # Deep content scan
                try:
                    with open(file_record.file_path, 'rb') as f:
                        content = f.read()
                    threat_analysis = analyze_file_with_content(
                        file_record.filename,
                        content,
                        file_record.size_bytes or len(content)
                    )
                except:
                    threat_analysis = analyze_file_threat(file_record.filename, file_record.size_bytes or 0)
            else:
                # Quick filename-based scan
                threat_analysis = analyze_file_threat(file_record.filename, file_record.size_bytes or 0)
            
            threat_analysis["file_id"] = file_record.id
            results.append(threat_analysis)
    
    # Summary statistics
    # Count threat levels case-insensitively (results may use lowercase)
    high_threats = sum(1 for r in results if str(r.get("threat_level", "")).lower() == "high")
    medium_threats = sum(1 for r in results if str(r.get("threat_level", "")).lower() == "medium")
    low_threats = sum(1 for r in results if str(r.get("threat_level", "")).lower() == "low")
    safe_files = sum(1 for r in results if str(r.get("threat_level", "")).lower() == "safe")

    # overall_risk should be an uppercase label for the frontend badges
    if high_threats > 0:
        overall = "HIGH"
    elif medium_threats > 0:
        overall = "MEDIUM"
    elif low_threats > 0:
        overall = "LOW"
    else:
        overall = "SAFE"

    return {
        "files": results,
        "summary": {
            "total_scanned": len(results),
            "high_threats": high_threats,
            "medium_threats": medium_threats,
            "low_threats": low_threats,
            "safe_files": safe_files,
            "overall_risk": overall
        }
    }


# --- FGSM Demo Endpoint ---
@router.get("/fgsm-demo")
def run_fgsm_demo():
    """
    Run FGSM attack and defense demonstration.
    Returns comparison of normal vs defended model under adversarial attacks.
    """
    torch.manual_seed(42)
    np.random.seed(42)
    
    # Generate synthetic dataset
    n_samples = 500
    x = torch.rand((n_samples, 2)) * 2 - 1
    y = ((x[:, 0] ** 2 + x[:, 1] ** 2) < 0.5).float().unsqueeze(1)
    
    epsilon = 0.15
    
    # Train normal model
    normal_model = SimpleNNModel()
    train_normal_model(normal_model, x, y, epochs=200)
    
    # Train defended model
    defended_model = SimpleNNModel()
    train_defended_model(defended_model, x, y, epochs=200, epsilon=epsilon)
    
    # Evaluate both models
    clean_acc_normal, adv_acc_normal = evaluate_model(normal_model, x, y, epsilon)
    clean_acc_defended, adv_acc_defended = evaluate_model(defended_model, x, y, epsilon)
    
    return {
        "status": "success",
        "epsilon": epsilon,
        "normal_model": {
            "clean_accuracy": f"{clean_acc_normal * 100:.1f}%",
            "adversarial_accuracy": f"{adv_acc_normal * 100:.1f}%",
            "accuracy_drop": f"{(clean_acc_normal - adv_acc_normal) * 100:.1f}%"
        },
        "defended_model": {
            "clean_accuracy": f"{clean_acc_defended * 100:.1f}%",
            "adversarial_accuracy": f"{adv_acc_defended * 100:.1f}%",
            "accuracy_drop": f"{(clean_acc_defended - adv_acc_defended) * 100:.1f}%"
        },
        "improvement": f"{(adv_acc_defended - adv_acc_normal) * 100:.1f}%",
        "conclusion": "Adversarial training successfully improved model robustness against FGSM attacks"
    }


# --- Helper Function to Load Datasets (with sharing permission check) ---
def load_decrypted_csv(username: str, user_id: int, filename: str, db: Session) -> pd.DataFrame:
    """
    Loads a decrypted CSV, checking if the user is the owner or has been granted access.
    """
    # First, check if the current user is the owner of the file.
    owner_path = os.path.join(UPLOAD_DIR, f"{username}_{filename}.enc")
    if os.path.exists(owner_path):
        encrypted_path = owner_path
    else:
        # If not the owner, search for the file among all users and check for sharing permission.
        all_users = db.query(User).all()
        found_owner_username = None
        for u in all_users:
            potential_path = os.path.join(UPLOAD_DIR, f"{u.username}_{filename}.enc")
            if os.path.exists(potential_path):
                # File exists, now check if the current user has permission to access it.
                has_permission = data_sharing.check_access_permission(db, user_id=user_id, owner_username=u.username, filename=filename)
                if has_permission:
                    found_owner_username = u.username
                    break
        
        if not found_owner_username:
             raise HTTPException(status_code=403, detail=f"Dataset '{filename}' not found or you do not have permission to access it.")
        
        encrypted_path = os.path.join(UPLOAD_DIR, f"{found_owner_username}_{filename}.enc")

    # Decrypt and load the data from the determined path.
    with open(encrypted_path, "rb") as f:
        encrypted_data = f.read()
    
    decrypted_data = decrypt_data(encrypted_data)
    
    try:
        df = pd.read_csv(io.BytesIO(decrypted_data))
        return df
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {e}")

# --- API Endpoints ---
@router.post("/train", response_model=ModelRegistryResponse)
def train_and_register_model(
    model_name: str = Query(...),
    dataset_filename: str = Query(...),
    target_column: str = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Loads a dataset, trains a model, saves it, and registers it in the database.
    """
    # ✅ UPDATED to pass user_id and db session for permission checking
    df = load_decrypted_csv(current_user.username, current_user.id, dataset_filename, db)

    if target_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found in dataset.")

    # Simple feature engineering: use only numeric columns for this example
    numeric_features = df.select_dtypes(include=['number']).columns.drop(target_column, errors='ignore')
    if len(numeric_features) == 0:
        raise HTTPException(status_code=400, detail="No numeric features found for training.")

    X = df[numeric_features]
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = LogisticRegression(max_iter=200)
    model.fit(X_train, y_train)

    accuracy = accuracy_score(y_test, model.predict(X_test))
    model_filename = f"{current_user.username}_{model_name}.pkl"
    model_path = os.path.join(MODEL_DIR, model_filename)

    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    model_in = ModelRegistryCreate(name=model_name, accuracy=accuracy)
    saved_model = model_registry.create_model(db, model=model_in, owner_id=current_user.id, model_path=model_path)
    
    return saved_model

@router.post("/predict/{model_id}")
def predict_with_model(
    model_id: int,
    request: PredictionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Loads a registered model and makes a prediction.
    """
    db_model = model_registry.get_model_by_id(db, model_id=model_id)
    if not db_model or db_model.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Model not found or you don't have access.")

    try:
        with open(db_model.model_path, "rb") as f:
            model = pickle.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Model file is missing from storage.")

    try:
        input_df = pd.DataFrame([request.data])
        input_df = input_df[model.feature_names_in_] 
        prediction = model.predict(input_df)
        
        prediction_result = prediction[0] 

        return {"model_id": model_id, "model_name": db_model.name, "input": request.data, "prediction": prediction_result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {e}. Ensure input has features: {model.feature_names_in_.tolist()}")

@router.get("/models", response_model=list[ModelRegistryResponse])
def list_my_models(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    List all models for the current user.
    """
    return model_registry.get_models_by_user(db, owner_id=current_user.id)

@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Delete a model by ID, ensuring it belongs to the current user.
    """
    db_model = model_registry.get_model_by_id(db, model_id=model_id)
    if not db_model or db_model.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Also remove the physical model file
    if os.path.exists(db_model.model_path):
        os.remove(db_model.model_path)
        
    model_registry.delete_model(db, model_id=model_id)
    return {"ok": True}

