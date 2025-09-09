from fastapi import APIRouter
from src.helpers import load_model
from src.schemas import LogitLensRequest
import src.config as config
import logging
from datetime import datetime
import src.state as state
from src.services.logitlens import logitlens
import modal

router = APIRouter(
    prefix="/logitlens",
    tags=["logitlens"],
)

logger = logging.getLogger(__name__)


@router.post("")
async def logitlens_endpoint(request: LogitLensRequest):
    if config.USE_MODAL:
        ModelRunner = modal.Cls.from_name(config.MODAL_APP_NAME, "Gemma2BModelRunner")
        model_runner = ModelRunner()
        return model_runner.logitlens.remote(request)
    else:
        model = load_model(request.model_name)
        response = logitlens(request, model)
        state.model_expirations[request.model_name] = datetime.now().isoformat()
        logger.info(
            f"Loaded model {request.model_name} at {datetime.now().isoformat()}"
        )
        return response
