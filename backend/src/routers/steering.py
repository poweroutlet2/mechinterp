from fastapi import APIRouter
from src.schemas import (
    RunWithSteeringRequest,
    SteeringVectorRequest,
)
import src.config as config
import httpx
import src.state as state
from src.services.steering import calculate_steering_vectors, run_with_steering
from datetime import datetime


router = APIRouter(
    prefix="/steering",
    tags=["steering"],
)


@router.post("/calculate")
async def calculate_steering_vectors_endpoint(request: SteeringVectorRequest):
    if config.USE_MODAL:
        url = f"https://{config.MODAL_WORKSPACE_NAME}--{config.MODAL_APP_NAME}-steering_vectors.modal.run"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=request.model_dump(), timeout=httpx.Timeout(60.0)
            )
            response.raise_for_status()
            state.model_expirations[request.model_name] = datetime.now().isoformat()
            return response.json()
    else:
        return calculate_steering_vectors(request)


@router.post("/run_with_steering")
async def run_with_steering_endpoint(request: RunWithSteeringRequest):
    """Runs the model with and without the steering vectors.

    Args:
      request: The run with steering request containing model name and prompts
    """
    if config.USE_MODAL:
        url = f"https://{config.MODAL_WORKSPACE_NAME}--{config.MODAL_APP_NAME}-steering_vectors.modal.run"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=request.model_dump(), timeout=httpx.Timeout(60.0)
            )
            response.raise_for_status()
            state.model_expirations[request.model_name] = datetime.now().isoformat()
            return response.json()
    else:
        return run_with_steering(request)
