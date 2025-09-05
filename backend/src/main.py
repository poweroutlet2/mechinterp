from contextlib import asynccontextmanager
from datetime import datetime
from typing import NamedTuple
from fastapi import FastAPI
from transformer_lens import HookedTransformer
from transformer_lens.hook_points import HookPoint
from torch import Tensor
import torch as t
import transformer_lens.utils as utils
from fastapi.middleware.cors import CORSMiddleware
import logging
import src.config as config
import httpx
from src.schemas import LogitLensLayer, LogitLensRequest, LogitLensResponse


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

model_expirations = {}
loaded_models = {}
available_models = [
    "gpt2-small",
    "gpt2-medium",
    "qwen3-0.6b",
    "gemma-2b",
]


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


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/available_models")
async def list_models():
    """Lists the models available for use."""
    return available_models


@app.get("/loaded_models")
async def list_loaded_models():
    """Lists the models that have been loaded on the server.

    Returns:
        A dictionary with the model name as the key and the timestamp of when the model was loaded as the value.
    """
    return model_expirations


def load_model(model_name: str):
    """Loads the specified model. On modal, this effectively just calls the model.from_pretrained method.

    Args:
        model_name: The name of the model to load.

    Returns:
        The loaded model.
    """

    if model_name in loaded_models.keys():
        logger.info(f"Model {model_name} already loaded.")
        return loaded_models[model_name]

    logger.info(f"Loading model {model_name}...")
    device = utils.get_device()
    model = HookedTransformer.from_pretrained(
        model_name, device=device, default_prepend_bos=False
    )

    loaded_models[model_name] = model
    model_expirations[model_name] = datetime.now().isoformat()

    logger.info(f"Model {model_name} successfully loaded!")
    return model


@app.post("/logitlens")
async def logitlens_endpoint(request: LogitLensRequest):
    if config.USE_MODAL:
        url = f"https://{config.MODAL_WORKSPACE_NAME}--{config.MODAL_APP_NAME}-logitlens.modal.run"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=request.model_dump(), timeout=httpx.Timeout(60.0)
            )
            response.raise_for_status()
            model_expirations[request.model_name] = datetime.now().isoformat()
            logger.info(
                f"Loaded model {request.model_name} at {datetime.now().isoformat()}"
            )
            return response.json()
    else:
        response = logitlens(request)
        model_expirations[request.model_name] = datetime.now().isoformat()
        logger.info(
            f"Loaded model {request.model_name} at {datetime.now().isoformat()}"
        )
        return response


class RawResid(NamedTuple):
    hook_name: str
    resid: Tensor


def logitlens(request: LogitLensRequest):
    """Runs the input text through the selected model and returns the most probable token
    after each model layer for each input token.
    """

    input = request.input
    model_name = request.model_name

    model = load_model(model_name)

    raw_resids: list[RawResid] = []

    def post_resid_filter(name: str):
        return "resid_post" in name

    def post_resid_hook(resid, hook: HookPoint):
        raw_resids.append(RawResid(hook_name=hook.name, resid=resid))

    logger.info("Sending input to model...")
    input_tokens = model.to_str_tokens(input)

    output: Tensor = model.run_with_hooks(
        input, fwd_hooks=[(post_resid_filter, post_resid_hook)]
    )

    last_logits = output[0, -1]
    most_likely_token_index = last_logits.argmax()
    most_likely_token = model.to_string(most_likely_token_index)

    logit_lens: list[LogitLensLayer] = []

    # for each post transformer block residual state
    for result in raw_resids:
        logits = model.unembed(model.ln_final(result.resid))
        probs = t.softmax(logits, -1)

        max_probs = probs[0].max(dim=1)
        max_token_indices = max_probs.indices

        max_probs = max_probs.values.tolist()
        max_prob_tokens = [model.to_string(idx.item()) for idx in max_token_indices]

        logit_lens.append(
            LogitLensLayer(
                hook_name=result.hook_name,
                max_probs=max_probs,
                max_prob_tokens=max_prob_tokens,
            )
        )

    result: LogitLensResponse = {
        "input_tokens": input_tokens,
        "most_likely_token": most_likely_token,
        "logit_lens": logit_lens,
    }

    return result
