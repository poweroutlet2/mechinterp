This is a simple webapp that lets you examine the inner workings of transformer models using the [TransformerLens](https://github.com/TransformerLensOrg/TransformerLens) library. The UI allows you
to run input text through a model and apply a logit lens to the model's output after each layer to view the most likely next token at each layer.

# Getting Started
This app uses FastAPI to serve and analyze models and NextJS to display the user interface. To start the
development servers:

```bash
# start the FastAPI dev server
cd backend

uv sync --all-groups
uv run python -m fastapi dev src/main.py     
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
Modal is a platorm that allows you to easily use GPUs on the cloud. It has a generous free tier ($30 per month at the time of writing). This can be useful
if you do not have a powerful GPU locally or if you want to deploy the app yourself.

Note: There is currently no rate limitting or authentication present in the API. Please consider this if you decide to upgrade from the Modal free tier.

To start the api and utilize Modal for GPU processing
1. Copy `.example.env` to `.env`:
    ```bash 
    cd backend
    cp .example.env .env
    ```

2. Create a [Modal](https://modal.com) account, create a new access token, and set the `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`, and `MODAL_WORKSPACE_NAME` environment 
variables in the `.env` file. You can find your workspace name in the Modal dashboard.

3. Set the `USE_MODAL` environment variable to `True` in the `.env` file. 

4. Deploy the Modal app:
```bash
    uv run python -m modal deploy src/modal_app.py   
```
    This will create modal endpoints that the FastAPI server will call.

5. Run the dev server. 


# Creating a Modal compatible FastAPI endpoint
To enable quicker cold starts, this app uses Modal GPU snapshots. This means that the first time a model is loaded, a snapshot
will be taken and used for subsequent calls instead of loading the model from scratch every time.

1. Create the necessary FastAPI router/endpoint/service and register it with the FastAPI app. The service function should take 
the input request and an optional model parameter. An example can be found in `src/routers/logitlens.py`.
2. The route should have two paths: one for if the `USE_MODAL` envvar is enabled and one for if it is not. Example can be found in `src/routers/logitlens.py`.
3. Add a method to the `_BaseModelRunner` class in `src/modal_app.py` that calls the main service function.
4. Deploy the modal app.


# Adding a new GPU snapshotted model to Modal
To add a new model to Modal:
1. Add the model to the `runners` dictionary in `src/modal_app.py`.
2. Use the `build_runner()` function to create the runner class.
3. Deploy the modal app.