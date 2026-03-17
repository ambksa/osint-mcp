FROM python:3.11-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml .
COPY src/ src/

RUN uv sync --no-dev

EXPOSE 8080

CMD ["uv", "run", "osint-mcp", "--transport", "sse", "--host", "0.0.0.0", "--port", "8080"]
