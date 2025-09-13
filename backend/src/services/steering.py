from transformer_lens import HookedTransformer
import torch as t
import gc
from src.helpers import load_model
from src.schemas import (
    RunWithSteeringRequest,
    RunWithSteeringResponse,
    SteeringVectorRequest,
    SteeringVectorResponse,
)
from transformer_lens.hook_points import HookPoint
import logging
from typing import List, Optional


logger = logging.getLogger(__name__)


def add_special_tokens_with_assistant_response(
    user_prompts: List[str],
    tokenizer,
    system_prompt: Optional[str] = None,
    assistant_responses: Optional[List[str]] = None,
) -> List[str]:
    """
    Wrap a list[str] of user prompts and assistant responses with Llama-2-7B-Chat special tokens using
    the model's chat template.

    Args:
        user_prompts: List of user prompt strings
        assistant_responses: List of assistant response strings
        system_prompt: Optional system message to prepend (None to omit)
        tokenizer: the model's tokenizer

    Returns:
        List of formatted strings ready to be tokenized and fed to the model
    """

    formatted: List[str] = []
    for user_prompt, assistant_response in zip(user_prompts, assistant_responses):
        messages = (
            [{"role": "system", "content": system_prompt}] if system_prompt else []
        )
        messages += [{"role": "user", "content": user_prompt}]
        messages += [{"role": "assistant", "content": assistant_response}]

        text: str = tokenizer.apply_chat_template(
            messages,
            tokenize=False,  # return a string with special tokens
        )
        formatted.append(text)

    return formatted


def add_special_tokens(
    user_prompt: str,
    tokenizer,
    system_prompt: Optional[str] = None,
    add_generation_prompt: bool = True,
) -> str:
    """
    Wrap single user prompt with Llama-2-7B-Chat special tokens using the model's chat template.

    Args:
        user_prompt: User prompt string
        system_prompt: Optional system message to prepend (None to omit)
        add_generation_prompt: Whether to add the generation prompt for the assistant
        tokenizer: the model's tokenizer

    Returns:
        Formatted string ready to be tokenized and fed to the model
    """

    messages = [{"role": "system", "content": system_prompt}] if system_prompt else []
    messages += [{"role": "user", "content": user_prompt}]

    text: str = tokenizer.apply_chat_template(
        messages,
        tokenize=False,  # return a string with special tokens
        add_generation_prompt=add_generation_prompt,  # leave the model ready to generate assistant reply
    )

    return text


def get_activations(
    model: HookedTransformer,
    prompts: list[str],
    layer_indices: list[int] = None,
    batch_size=16,
):
    """Runs the model with cache and captures the last-token residual stream vectors from the specified layers for each prompt.

    Args:
        model: The model to run
        prompts: The prompts to run through the model
        layer_indices: The layer indicies to collect activations from. If None, collects from all
            layers.
        batch_size:

    Returns: A dict of { layer_idx: tensor [num_prompts, d_model] } containing the last-token
        residual stream vectors for each prompt for each specified layer.
    """

    if not layer_indices:
        layer_indices = list(range(model.cfg.n_layers))

    activations = {idx: [] for idx in layer_indices}

    for i in range(0, len(prompts), batch_size):
        batch = prompts[i : i + batch_size]
        with t.no_grad():
            _, cache = model.run_with_cache(batch)

        for idx in layer_indices:
            act = cache[f"blocks.{idx}.hook_resid_post"]
            act_final = act[:, -1, :]  # last token
            activations[idx].append(act_final)

        t.cuda.empty_cache()
        gc.collect()

    # Concatenate across batches
    return {idx: t.cat(tensors, dim=0) for idx, tensors in activations.items()}


def calculate_mean_difference(positive_activations: dict, negative_activations: dict):
    """Calculates the steering vectors for the behavior seen from the prompts that generated the input
        positive_activations for each layer index key.

    Args:
      positive_activations: a dict of [layer_idx: last_token_resid_post_vector] containing the activations from
        input prompts that make the model exhibit the behavior of the steering vector you're looking for.
      negative_activations: a dict of [layer_idx: last_token_resid_post_vector] containing the activations from
        input prompts that make the model exhibit the opposite behavior of the steering vector you're looking for.

    Returns: A dict mapping each layer index to a tensor of shape [d_model] containing the steering vector.
    """
    steering_vectors = {}
    for layer_idx in positive_activations.keys():
        positive_mean = positive_activations[layer_idx].mean(dim=0)
        negative_mean = negative_activations[layer_idx].mean(dim=0)
        steering_vectors[layer_idx] = positive_mean - negative_mean

    # L2 normalize
    # for layer_idx in steering_vectors.keys():
    #     steering_vectors[layer_idx] = steering_vectors[layer_idx] / (
    #         steering_vectors[layer_idx].norm() + 1e-8
    #     )

    return steering_vectors


def calculate_steering_vectors(
    request: SteeringVectorRequest, model: HookedTransformer = None
):
    """Gets the steering vectors for the behavior seen from the prompts that generated the input
        positive_activations for each layer index key.

    Args:
      request: The steering vector request containing model name and prompts
    """
    if not model:
        model = load_model(request.model_name)

    positive_prompts = add_special_tokens_with_assistant_response(
        user_prompts=request.user_prompts,
        tokenizer=model.tokenizer,
        assistant_responses=request.assistant_positive_responses,
    )
    negative_prompts = add_special_tokens_with_assistant_response(
        user_prompts=request.user_prompts,
        tokenizer=model.tokenizer,
        assistant_responses=request.assistant_negative_responses,
    )

    # Remove the end of turn token (for capturing activations)
    positive_prompts_trunc = [
        prompt.replace("<end_of_turn>", "") for prompt in positive_prompts
    ]
    negative_prompts_trunc = [
        prompt.replace("<end_of_turn>", "") for prompt in negative_prompts
    ]

    positive_activations = get_activations(model, positive_prompts_trunc)
    negative_activations = get_activations(model, negative_prompts_trunc)
    steering_vectors = calculate_mean_difference(
        positive_activations, negative_activations
    )

    # Convert tensors to lists for JSON serialization
    steering_vectors_json = {
        layer_idx: vector.tolist() for layer_idx, vector in steering_vectors.items()
    }

    return SteeringVectorResponse(steering_vectors=steering_vectors_json)


def apply_steering_vector_hook(
    activations: t.Tensor,
    hook: HookPoint,  # The hook itself is not used but is a required argument
    steering_vector: t.Tensor,
    scaling_factor: float,
) -> t.Tensor:
    """
    TransformerLens hook function to apply a steering vector to all token positions.
    """
    # Ensure the steering vector is on the same device as the activations
    scaled_steering_vector = (scaling_factor * steering_vector).to(
        device=activations.device, dtype=activations.dtype
    )

    # # Add the steering vector to all token positions.
    # # The vector [d_model] will be broadcast across the [batch, position] dimensions.
    activations = activations + scaled_steering_vector

    # activations = activations.clone()
    # activations[:, -1, :] = activations[:, -1, :] + scaled_steering_vector
    return activations


def generate_with_steering(
    model: HookedTransformer,
    prompt: str,
    steering_vectors: dict[int, t.Tensor],
    layer_idx: int,
    scaling_factor=1.0,
    max_tokens: int = 100,
):
    """ """
    steering_vector_at_layer = steering_vectors[layer_idx]

    def specific_steering_hook(activations, hook):
        return apply_steering_vector_hook(
            activations, hook, steering_vector_at_layer, scaling_factor
        )

    input_ids = model.to_tokens(prompt)

    with t.no_grad():
        model.add_hook(f"blocks.{layer_idx}.hook_resid_post", specific_steering_hook)
        generated_ids = model.generate(
            input_ids,
            max_new_tokens=max_tokens,
            eos_token_id=model.tokenizer.eos_token_id,
            do_sample=False,
        )
        model.reset_hooks()
    response = model.to_string(generated_ids)
    return response[0]


def run_with_steering(request: RunWithSteeringRequest, model: HookedTransformer = None):
    if not model:
        model = load_model(request.model_name)

    # Convert steering vectors from lists back to tensors
    steering_vectors = {
        layer_idx: t.tensor(vector)
        for layer_idx, vector in request.steering_vectors.items()
    }

    prompt_with_special_tokens = add_special_tokens(
        request.prompt, model.tokenizer, system_prompt=None
    )

    steered_response = generate_with_steering(
        model,
        prompt_with_special_tokens,
        steering_vectors,
        request.layer,
        request.scaling_factor,
        request.max_tokens,
    )
    unsteered_response = model.generate(
        prompt_with_special_tokens, max_new_tokens=request.max_tokens
    )

    return RunWithSteeringResponse(
        steered_response=steered_response,
        unsteered_response=unsteered_response,
    )
