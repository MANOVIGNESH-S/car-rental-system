FROM python:3.11

WORKDIR /app

RUN pip install uv

# copy EVERYTHING first
COPY . .

# install deps (now README exists)
RUN uv sync

CMD ["sh", "-c", "alembic upgrade head && uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 1"]