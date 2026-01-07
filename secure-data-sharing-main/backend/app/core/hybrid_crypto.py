from cryptography.fernet import Fernet
from .rsa_utils import encrypt_aes_key, decrypt_aes_key


def hybrid_encrypt(data: bytes, user_public_key: bytes):
    aes_key = Fernet.generate_key()
    fernet = Fernet(aes_key)

    encrypted_data = fernet.encrypt(data)
    encrypted_aes_key = encrypt_aes_key(aes_key, user_public_key)

    return encrypted_data, encrypted_aes_key


def hybrid_decrypt(encrypted_data: bytes, encrypted_aes_key: bytes, user_private_key: bytes):
    aes_key = decrypt_aes_key(encrypted_aes_key, user_private_key)
    fernet = Fernet(aes_key)

    return fernet.decrypt(encrypted_data)
