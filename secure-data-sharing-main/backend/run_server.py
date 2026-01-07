# Run server script
import os
import sys

# Add the backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    import uvicorn
    os.chdir(backend_dir)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
