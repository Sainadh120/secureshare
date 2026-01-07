from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api.endpoints import users, auth, me, files, ml, federated

# Initialize FastAPI app FIRST
app = FastAPI(
    title="Mirai Secure ML System",
    version="0.1.0",
    description="A secure system for file handling and ML model training/management."
)

# NOW you can use the 'app' variable
# Create database tables on startup
# This ensures that your tables are created before the app starts listening for requests.
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


# --- CORS Middleware ---
# This block is crucial for allowing your React frontend (running on port 5173)
# to communicate with your backend (running on port 8000).
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://localhost:5177",
    "http://127.0.0.1:5177",
    "http://localhost:5178",
    "http://127.0.0.1:5178",
    "http://localhost:5179",
    "http://127.0.0.1:5179",
    "http://localhost:5180",
    "http://127.0.0.1:5180",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)


# --- API Routers ---
# Including the routers with their respective prefixes.
# This structure is correct and is what we used to debug the frontend URLs.
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(me.router, prefix="/users", tags=["Current User (Me)"]) # Merged with users but can be separate
app.include_router(files.router, prefix="/files", tags=["Files"])
app.include_router(ml.router, prefix="/ml", tags=["Machine Learning"])
app.include_router(federated.router, prefix="/federated", tags=["Federated Learning"])

# --- Root Endpoint ---
# A simple health check endpoint to confirm the server is running.
@app.get("/", tags=["Health Check"])
def health():
    """
    Check if the API is up and running.
    """
    return {"status": "ok", "message": "Welcome to Mirai API"}

