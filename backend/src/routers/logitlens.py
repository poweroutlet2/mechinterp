from fastapi import APIRouter
from src.schemas import LogitLensRequest
import src.config as config
import httpx
import logging
from datetime import datetime
import src.state as state
from src.services.logitlens import logitlens

router = APIRouter(
    prefix="/logitlens",
    tags=["logitlens"],
)

logger = logging.getLogger(__name__)


@router.post("")
async def logitlens_endpoint(request: LogitLensRequest):
    if config.USE_MODAL:
        url = f"https://{config.MODAL_WORKSPACE_NAME}--{config.MODAL_APP_NAME}-logitlens.modal.run"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=request.model_dump(), timeout=httpx.Timeout(60.0)
            )
            response.raise_for_status()
            state.model_expirations[request.model_name] = datetime.now().isoformat()
            logger.info(
                f"Loaded model {request.model_name} at {datetime.now().isoformat()}"
            )
            return response.json()
    else:
        response = logitlens(request)
        state.model_expirations[request.model_name] = datetime.now().isoformat()
        logger.info(
            f"Loaded model {request.model_name} at {datetime.now().isoformat()}"
        )
        return response
