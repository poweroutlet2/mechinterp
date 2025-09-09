import logging
from datetime import datetime, timezone
from transformer_lens import HookedTransformer, utils
from src.state import loaded_models, model_expirations

logger = logging.getLogger(__name__)


def update_model_expiration(model_name: str) -> str:
    """Update the model's expiration timestamp to the current UTC time.

    Args:
        model_name: The name of the model to update.

    Returns:
        The RFC 3339 UTC timestamp string with millisecond precision and 'Z' suffix.
    """

    timestamp = (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )
    model_expirations[model_name] = timestamp
    return timestamp


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
    update_model_expiration(model_name)

    logger.info(f"Model {model_name} successfully loaded!")
    return model
