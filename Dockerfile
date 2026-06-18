# Multi-stage build: compile the Vite frontend, then serve it from FastAPI.

# 1. Build the React/Vite client (Vite 7 needs Node 20.19+/22.12+; use 22).
FROM node:22-slim AS client
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2. Python backend that also serves the built client from /app/static.
FROM python:3.12-slim AS backend
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt
COPY backend/ ./
COPY --from=client /client/dist ./static

# Render provides $PORT; default to 8787 for local `docker run`.
ENV PORT=8787
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
