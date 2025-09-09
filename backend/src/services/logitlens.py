from typing import NamedTuple
from torch import Tensor
from src.schemas import LogitLensRequest, LogitLensLayer, LogitLensResponse
import logging
from transformer_lens.hook_points import HookPoint
import torch as t
from transformer_lens import HookedTransformer
from src.helpers import load_model

logger = logging.getLogger(__name__)


class RawResid(NamedTuple):
    hook_name: str
    resid: Tensor


def logitlens(request: LogitLensRequest, model: HookedTransformer = None):
    """Runs the input text through the selected model and returns the most probable token
    after each model layer for each input token.
    """

    if not model:
        model = load_model(request.model_name)

    input = request.input

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
