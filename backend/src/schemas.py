from pydantic import BaseModel


class LogitLensLayer(BaseModel):
    hook_name: str
    max_probs: list[float]
    max_prob_tokens: list[str]


class LogitLensRequest(BaseModel):
    model_name: str
    input: str


class LogitLensResponse(BaseModel):
    input_tokens: list[str]
    most_likely_token: str
    logit_lens: list[LogitLensLayer]
