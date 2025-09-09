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


class SteeringVectorRequest(BaseModel):
    model_name: str
    positive_prompts: list[str]
    negative_prompts: list[str]


class SteeringVectorResponse(BaseModel):
    steering_vectors: dict[int, list[float]]


class RunWithSteeringRequest(BaseModel):
    model_name: str
    prompt: list[str]
    steering_vectors: dict[int, list[float]]
    layer: int
    scaling_factor: float = 1.0
    max_tokens: int


class RunWithSteeringResponse(BaseModel):
    steered_response: str
    unsteered_response: str
