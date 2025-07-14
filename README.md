This is a simple app that lets you examine the inner workings of a transformer model using the [TransformerLens](https://github.com/TransformerLensOrg/TransformerLens) library. The UI allows you
to run input text through a toy model and apply a logit lens to the model's output and visualize the
logit lens of the model's output after each layer.

# Getting Started
This app uses FastAPI for the backend API and NextJS for the frontend UI. Since they are deployed on completely different
infrastructure providers, the directories are treated as individual projects during development. To start the
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
Modal is a platorm that allows you to easily use GPUs on the cloud. It also has a pretty generous free tier. This can be useful
for running some of the models or if you want to deploy this yourself.

To run the api and utilize modal for GPU processing
1. Copy `.example.env` to `.env`:
    ```bash 
    cd backend
    cp .example.env .env
    ```
3. Create a modal account and set the `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` environment variables.

4. Set the `USE_MODAL` and `MODAL_WORKSPACE_NAME` environment variables to `True` in the `.env` file. You can find your workspace name in the modal dashboard.
5. Deploy the modal app:
    ```bash
    uv run python3 -m modal deploy modal_app.py   
    ```
    This will create modal endpoints that the FastAPI server will call.
5. Run the dev server. 



