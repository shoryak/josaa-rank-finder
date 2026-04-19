FROM python:3.11-slim

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Build Next.js static export
RUN cd frontend && npm install && npm run build

# Install Python deps
RUN pip install -r backend/requirements.txt

EXPOSE 8000
CMD cd backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
