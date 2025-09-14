from contextlib import asynccontextmanager
from fastapi import FastAPI
import torch as t
from fastapi.middleware.cors import CORSMiddleware
import logging
import src.config as config
import src.state as state
from src.routers.logitlens import router as logitlens_router
from src.routers.steering import router as steering_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Using modal: {config.USE_MODAL}")

    if not config.USE_MODAL and not t.cuda.is_available():
        logger.warning("CUDA is not available! Using CPU instead.")

    yield
    # Shutdown logic (optional)


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://www.hpatel.dev"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(logitlens_router)
app.include_router(steering_router)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/available_models")
async def list_models():
    """Lists the models available for use."""
    return [
        "gpt2-small",
        "gemma-2-2b-it",
        "llama-2-7b-chat",
        "qwen2.5-3b-instruct",
    ]


@app.get("/loaded_models")
async def list_loaded_models():
    """Lists the models that have been loaded on the server.

    Returns:
        A dictionary with the model name as the key and the timestamp of when the model was loaded as the value.
    """
    return state.model_expirations
