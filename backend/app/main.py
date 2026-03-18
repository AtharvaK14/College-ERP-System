import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from app.config import settings
from app.database import engine, Base
from app.routers import auth, admin, teacher, student, shared


async def wait_for_db(retries: int = 10, delay: float = 3.0):
    """Retry DB connection on startup instead of crashing immediately."""
    for attempt in range(1, retries + 1):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print(f"Database connected on attempt {attempt}")
            return
        except OperationalError as e:
            if attempt == retries:
                raise RuntimeError(
                    f"Could not connect to database after {retries} attempts"
                ) from e
            print(f"DB not ready (attempt {attempt}/{retries}), retrying in {delay}s...")
            await asyncio.sleep(delay)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await wait_for_db()
    yield
    await engine.dispose()


app = FastAPI(
    title="College ERP API",
    description="Backend for the SJCE College ERP System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(teacher.router)
app.include_router(student.router)
app.include_router(shared.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}