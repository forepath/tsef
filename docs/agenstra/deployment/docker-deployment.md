# Docker Deployment

Containerized deployment guide for Agenstra using Docker and Docker Compose.

## Overview

Docker deployment provides:

- Isolated environments
- Easy scaling
- Consistent deployments
- Simplified dependency management

## Prerequisites

- Docker 20.10 or higher
- Docker Compose 2.0 or higher

## Docker Compose Setup

### Backend Agent Controller

```bash
cd apps/backend-agent-controller
docker compose up -d
```

The `docker-compose.yaml` includes:

- PostgreSQL database container
- Agent controller API container
- Environment variable configuration
- Volume mounts for data persistence

### Backend Agent Manager

```bash
cd apps/backend-agent-manager
docker compose up -d
```

The `docker-compose.yaml` includes:

- PostgreSQL database container
- Agent manager API container
- Docker socket mount (for agent containers)
- Environment variable configuration

### Frontend Agent Console

```bash
cd apps/frontend-agent-console
docker compose up -d
```

The `docker-compose.yaml` includes:

- Nginx server container
- Built frontend application
- Environment variable configuration

## Container Configuration

### Environment Variables

Configure containers via environment variables in `docker-compose.yaml`:

```yaml
services:
  api:
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=postgres
      - DB_PASSWORD=postgres
      - DB_DATABASE=agent_controller
      - STATIC_API_KEY=your-api-key
      - CORS_ORIGIN=https://agenstra.com
      - RATE_LIMIT_ENABLED=true
```

### Volume Management

Persistent data storage:

```yaml
volumes:
  postgres_data:
    driver: local
```

### Network Configuration

Container networking:

```yaml
networks:
  default:
    driver: bridge
```

## Building Containers

### Build API Container

```bash
# Agent Controller
nx docker:api backend-agent-controller

# Agent Manager
nx docker:api backend-agent-manager
```

### Build Frontend Container

```bash
nx docker:server frontend-agent-console
```

## Running Containers

### Using Docker Compose (Recommended)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Using Docker Directly

```bash
# Run agent controller
docker run -d \
  --name agent-controller \
  -p 3100:3100 \
  -p 8081:8081 \
  -e DB_HOST=postgres \
  -e STATIC_API_KEY=your-api-key \
  backend-agent-controller:api

# Run agent manager (with Docker socket)
docker run -d \
  --name agent-manager \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 3000:3000 \
  -p 8080:8080 \
  -e DB_HOST=postgres \
  -e STATIC_API_KEY=your-api-key \
  backend-agent-manager:api
```

## Docker Socket Mount

**Important**: The agent-manager requires Docker socket access to manage agent containers:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

This allows the container to communicate with the host Docker daemon.

## Health Checks

Containers include health checks:

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:3100/health']
  interval: 30s
  timeout: 10s
  retries: 3
```

## Logging

View container logs:

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api

# Last 100 lines
docker compose logs --tail=100 api
```

## Related Documentation

- **[Local Development](./local-development.md)** - Local setup
- **[Production Checklist](./production-checklist.md)** - Production deployment
- **[Environment Configuration](./environment-configuration.md)** - Environment variables

---

_For production deployment, see the [Production Checklist](./production-checklist.md)._
