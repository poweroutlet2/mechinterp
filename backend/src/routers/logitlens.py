from fastapi import APIRouter
from src.modal_app import runners
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
    model_name = request.model_name

    if config.USE_MODAL:
        ModelRunner = modal.Cls.from_name(config.MODAL_APP_NAME, runners[model_name])
        model_runner = ModelRunner()
        state.model_expirations[request.model_name] = datetime.now().isoformat()
        logger.info(
            f"Loaded model {request.model_name} at {datetime.now().isoformat()}"
        )
        return model_runner.logitlens.remote(request)
    else:
        response = logitlens(request)
        state.model_expirations[request.model_name] = datetime.now().isoformat()
        logger.info(
            f"Loaded model {request.model_name} at {datetime.now().isoformat()}"
        )
        return response
