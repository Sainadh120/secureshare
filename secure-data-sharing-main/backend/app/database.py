from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Dev default: SQLite file in project root. Swap this for Postgres/MySQL in production.
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

# SQLite needs this arg when used in single-threaded dev mode
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# FastAPI dependency – yields a DB session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
