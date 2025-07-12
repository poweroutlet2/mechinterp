This is a simple app that lets you examine the inner workings of a transformer model using the [TransformerLens](https://github.com/TransformerLensOrg/TransformerLens) library. The UI allows you
to run input text through a toy model and apply a logit lens to the model's output and visualize the
logit lens of the model's output after each layer.

# Getting Started
This app uses FastAPI for the backend API and NextJS for the frontend UI. To start the
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

npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:8000/docs](http://localhost:8000/docs) to see the API docs.
Open [http://localhost:3000](http://localhost:3000) to see the UI.