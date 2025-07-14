import modal
import config

app_name = config.MODAL_APP_NAME
app = modal.App(app_name)

# you can add apt and pip installs here, along with any other image setup
image = (
    modal.Image.debian_slim()
    .apt_install("pkg-config", "cmake", "build-essential")
    .pip_install("fastapi[standard]")
    .pip_install("torch")
    .pip_install("transformer_lens")
    .add_local_file("main.py", "/root/main.py")
    .add_local_file("config.py", "/root/config.py")
)


@app.function(gpu="T4", image=image)
@modal.fastapi_endpoint(
    method="POST",
    label=f"{app_name}-logitlens",  # app_name-endpoint_name
)
def modal_logitlens(request: dict):
    # Import inside the function to ensure main.py is available
    from main import LogitLensRequest, logitlens

    logit_request = LogitLensRequest(**request)
    return logitlens(logit_request)
