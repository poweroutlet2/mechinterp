This is a simple webapp that lets you examine the inner workings of transformer models using the [TransformerLens](https://github.com/TransformerLensOrg/TransformerLens) library. The UI allows you
to run input text through a model and apply a logit lens to the model's output after each layer to view the most likely next token at each layer.

# Getting Started
This app uses FastAPI to serve and analyze models and NextJS to display the user interface. To start the
development servers:

```bash
# start the FastAPI dev server
cd backend

uv sync --all-groups
uv run fastapi dev main.py     
```

```bash
# start the NextJS dev server
cd frontend

pnpm install
pnpm dev
```

Open [http://localhost:8000/docs](http://localhost:8000/docs) to see the API docs.
Open [http://localhost:3000](http://localhost:3000) to see the UI.

# Using Modal for GPU processing
By default, the app will use the local GPU if available and fallback to the CPU. If you want to use a cloud GPU, you can set up Modal.
Modal is a platorm that allows you to easily use GPUs on the cloud. It has a generous free tier (for small projects like this). This can be useful
if you do not have a local GPU or if you want to deploy the app yourself.

Note: There is currently no rate limitting or authentication present in the API. Please consider this if you decide to upgrade from the Modal free tier.

To start the api and utilize Modal for GPU processing
1. Copy `.example.env` to `.env`:
    ```bash 
    cd backend
    cp .example.env .env
    ```
3. Create a (Modal)[https://modal.com] account, create a new access token, and set the `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`, and `MODAL_WORKSPACE_NAME` environment 
variables in the `.env` file. You can find your workspace name in the Modal dashboard.

4. Set the `USE_MODAL` environment variable to `True` in the `.env` file. 

5. Deploy the Modal app:
    ```bash
    uv run python3 -m modal deploy modal_app.py   
    ```
    This will create modal endpoints that the FastAPI server will call.
5. Run the dev server. 



