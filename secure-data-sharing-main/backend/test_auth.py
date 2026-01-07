from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)
resp = client.post('/auth/token', data={'username':'sai','password':'password'})
print('STATUS', resp.status_code)
print('TEXT', resp.text)
print('JSON', resp.json() if resp.text else {})
