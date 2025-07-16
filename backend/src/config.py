import os
from dotenv import load_dotenv

load_dotenv()

MODAL_APP_NAME = os.environ.get("MODAL_APP_NAME", "APP_NAME_NOT_SET")
MODAL_WORKSPACE_NAME = os.environ.get("MODAL_WORKSPACE_NAME", "WORKSPACE_NAME_NOT_SET")

USE_MODAL = os.environ.get("USE_MODAL", "False") == "True"

HF_TOKEN = os.environ.get("HF_TOKEN", "HF_TOKEN_NOT_SET")
