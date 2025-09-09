import modal
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


@app.cls(
    gpu="T4",
    enable_memory_snapshot=True,
    experimental_options={"enable_gpu_snapshot": True},
)
class GPT2ModelRunner:
    @modal.enter(snap=True)
    def load(self):
        # during enter phase of container lifecycle,
        # load the model onto the GPU so it can be snapshot
        model_name = "gpt2-small"
        device = utils.get_device()
        self.model = HookedTransformer.from_pretrained(
            model_name, device=device, default_prepend_bos=False
        )

    @modal.method()
    def generate(self, prompt: str) -> str:
        return self.model.generate(prompt, max_new_tokens=100)

    @modal.method()
    def logitlens(self, request: LogitLensRequest) -> str:
        return logitlens(request, self.model)


@app.cls(
    gpu="T4",
    enable_memory_snapshot=True,
    experimental_options={"enable_gpu_snapshot": True},
)
class Gemma2BModelRunner:
    @modal.enter(snap=True)
    def load(self):
        # during enter phase of container lifecycle,
        # load the model onto the GPU so it can be snapshot
        model_name = "gemma-2b"
        device = utils.get_device()
        self.model = HookedTransformer.from_pretrained(
            model_name, device=device, default_prepend_bos=False
        )

    @modal.method()
    def generate(self, prompt: str) -> str:
        return self.model.generate(prompt, max_new_tokens=100)

    @modal.method()
    def logitlens(self, request: LogitLensRequest) -> str:
        return logitlens(request, self.model)
