FROM node:20-slim

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json ./
RUN npm install

# Copy app source (but exclude secrets via .dockerignore).
COPY . .

# Run as non-root (basic safety).
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

CMD ["node", "index.js"]
