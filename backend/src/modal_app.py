import modal
from src.schemas import RunWithSteeringRequest, SteeringVectorRequest
from src.services.steering import calculate_steering_vectors, run_with_steering
import src.config as config


# you can add apt and pip installs here, along with any other image setup
image = (
    modal.Image.debian_slim()
    .apt_install("pkg-config", "cmake", "build-essential")
    .uv_pip_install("fastapi[standard]")
    .uv_pip_install("torch")
    .uv_pip_install("transformer_lens")
    .env({"HF_TOKEN": config.HF_TOKEN})
    .add_local_dir(".", "/root", ignore=["__pycache__", ".git", ".env", ".venv"])
)
app_name = config.MODAL_APP_NAME
app = modal.App(app_name, image=image)


with image.imports():  # import in the global scope so imports can be snapshot
    from transformer_lens import HookedTransformer, utils
    from src.services.logitlens import logitlens
    from src.schemas import LogitLensRequest

snapshot_key = "v1"  # change this to invalidate the snapshot cache


class _BaseModelRunner:
    """
    Base class for all model runners.
    """

    @modal.enter(snap=True)
    def load(self):
        """
        This function is called when the snapshot is first loaded, and any setup done here
        will be cached and reused for subsequent calls.
        """

        device = utils.get_device()
        self.model = HookedTransformer.from_pretrained(
            self.MODEL_NAME, device=device, default_prepend_bos=False
        )

    @modal.method()
    def generate(self, prompt: str) -> str:
        return self.model.generate(prompt, max_new_tokens=100)

    @modal.method()
    def logitlens(self, request: LogitLensRequest):
        return logitlens(request, self.model)

    @modal.method()
    def calculate_steering_vectors(self, request: SteeringVectorRequest):
        return calculate_steering_vectors(request, self.model)

    @modal.method()
    def run_with_steering(self, request: RunWithSteeringRequest):
        return run_with_steering(request, self.model)


def build_runner(class_name: str, model_name: str, gpu: str = "T4"):
    """
    Build a runner class for a given model.
    """

    # Create a distinct class type with a unique name and MODEL_NAME
    attrs = {"MODEL_NAME": model_name}
    cls = type(class_name, (_BaseModelRunner,), attrs)

    # Apply app.cls to each class independently
    return app.cls(
        gpu=gpu,
        enable_memory_snapshot=True,
        experimental_options={"enable_gpu_snapshot": True},
    )(cls)


# Model name to runner class name mapping
runners = {
    "gpt2-small": "GPT2SmallModelRunner",
    "gemma-2b": "Gemma2BModelRunner",
    "gemma-7b": "Gemma7BModelRunner",
    "qwen-1.8b-chat": "Qwen18BModelRunner",
    "llama-2-7b-chat": "Llama27BModelRunner",
}

# Declare runner classes per model (each is independently decorated)
# Availabe gpus: https://modal.com/docs/guide/gpu
GPT2SmallModelRunner = build_runner("GPT2SmallModelRunner", "gpt2-small", gpu="T4")
Gemma2BModelRunner = build_runner("Gemma2BModelRunner", "gemma-2b", gpu="T4")
Gemma7BModelRunner = build_runner("Gemma7BModelRunner", "gemma-7b", gpu="T4")
Qwen18BModelRunner = build_runner("Qwen18BModelRunner", "qwen-1.8b-chat", gpu="T4")
Llama27BModelRunner = build_runner("Llama27BModelRunner", "llama-2-7b-chat", gpu="L40S")
