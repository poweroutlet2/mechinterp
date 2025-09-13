from fastapi import APIRouter
from src.schemas import (
    RunWithSteeringRequest,
    SteeringVectorRequest,
)
import src.config as config
from src.services.steering import calculate_steering_vectors, run_with_steering
from src.helpers import update_model_expiration
import modal
from src.modal_app import runners


router = APIRouter(
    prefix="/steering",
    tags=["steering"],
)


@router.get("/available_models")
async def available_models_endpoint():
    return ["gemma-2-2b-it", "llama-2-7b-chat", "qwen-1.8b-chat"]


@router.post("/calculate")
async def calculate_steering_vectors_endpoint(
    request: SteeringVectorRequest,
):
    model_name = request.model_name
    response = None

    if config.USE_MODAL:
        ModelRunner = modal.Cls.from_name(config.MODAL_APP_NAME, runners[model_name])
        model_runner = ModelRunner()
        response = model_runner.calculate_steering_vectors.remote(request)
    else:
        response = calculate_steering_vectors(request)

    update_model_expiration(request.model_name)
    return response


@router.post("/run_with_steering")
async def run_with_steering_endpoint(request: RunWithSteeringRequest):
    """Runs the model with and without the steering vectors.

    Args:
      request: The run with steering request containing model name and prompts
    """
    model_name = request.model_name
    response = None

    if config.USE_MODAL:
        ModelRunner = modal.Cls.from_name(config.MODAL_APP_NAME, runners[model_name])
        model_runner = ModelRunner()
        response = model_runner.run_with_steering.remote(request)
    else:
        response = run_with_steering(request)

    update_model_expiration(request.model_name)
    return response
