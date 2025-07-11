from contextlib import asynccontextmanager
import sys
from typing import NamedTuple
from fastapi import FastAPI
from pydantic import BaseModel
from transformer_lens import HookedTransformer
from transformer_lens.hook_points import HookPoint
from torch import Tensor
import torch as t
import transformer_lens.utils as utils


loaded_models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    if not t.cuda.is_available():
        print("CUDA is not available. Exiting application.", file=sys.stderr)
        sys.exit(1)
    yield
    # Shutdown logic (optional)


app = FastAPI(lifespan=lifespan)


@app.get("/")
async def root():
    return {"message": "Hello World"}


def load_model(model_name: str):
    if model_name in loaded_models.keys():
        print(f"Model {model_name} already loaded.")
        return loaded_models[model_name]

    print(f"Loading model {model_name}...")
    device = utils.get_device()
    model = HookedTransformer.from_pretrained(model_name, device=device)
    loaded_models[model_name] = model
    print("Model successfully loaded!")
    return model


class RawResid(NamedTuple):
    hook_name: str
    resid: Tensor


class LogitLensLayer(NamedTuple):
    hook_name: str
    max_probs: list
    max_prob_tokens: list


class LogitLensRequest(BaseModel):  # noqa: F821
    model_name: str
    input: str


@app.get("/available_models")
async def list_models():
    import transformer_lens.loading_from_pretrained as loading

    return {"models": loading.OFFICIAL_MODEL_NAMES}


@app.get("/loaded_models")
async def list_loaded_models():
    return loaded_models


@app.post("/logitlens")
async def logitlens(request: LogitLensRequest):
    """ """
    input = request.input
    model_name = request.model_name

    model = load_model(model_name)

    raw_resids: list[RawResid] = []

    def post_resid_filter(name: str):
        return "resid_post" in name

    def post_resid_hook(resid, hook: HookPoint):
        raw_resids.append(RawResid(hook_name=hook.name, resid=resid))

    print("Sending input to model...")
    output: Tensor = model.run_with_hooks(
        input, fwd_hooks=[(post_resid_filter, post_resid_hook)]
    )

    last_logits = output[0, -1]
    most_likely_token_index = last_logits.argmax()
    most_likely_token = model.to_string(most_likely_token_index)

    logit_lens: list[LogitLensLayer] = []

    # for each post transformer block residual state
    #
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

    result = {
        "most_likely_token": most_likely_token,
        "logit_lens": logit_lens,
    }

    return result
