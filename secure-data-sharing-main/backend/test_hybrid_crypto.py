from app.core.rsa_utils import generate_rsa_keypair
from app.core.hybrid_crypto import hybrid_encrypt, hybrid_decrypt

# Generate user RSA keys
private_key, public_key = generate_rsa_keypair()

# Sample confidential data
data = b"Confidential user file content"

# Encrypt data (AES + RSA)
encrypted_data, encrypted_key = hybrid_encrypt(data, public_key)

# Decrypt data (requires private key)
decrypted_data = hybrid_decrypt(encrypted_data, encrypted_key, private_key)

print("Original Data :", data)
print("Decrypted Data:", decrypted_data)

assert data == decrypted_data
print("HYBRID ENCRYPTION SUCCESS")
