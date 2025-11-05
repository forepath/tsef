# backend-agent-manager

NestJS backend application for managing and interacting with AI agents through HTTP REST API and WebSocket gateway.

## Purpose

This application provides a complete agent management system by integrating the `@forepath/framework-backend-feature-agent-manager` library. It enables the creation, management, and real-time interaction with AI agents through both synchronous HTTP requests and persistent WebSocket connections.

See the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#purpose) for detailed feature descriptions.

## Features

This application provides:

- **HTTP REST API** - Full CRUD operations for agent management
- **WebSocket Gateway** - Real-time bidirectional communication with agents
- **Container Integration** - Docker container management for agent execution
- **Secure Authentication** - Keycloak integration for HTTP endpoints and database-backed authentication for WebSocket
- **Database Support** - PostgreSQL with TypeORM for data persistence
- **Auto Migrations** - Automatic database schema migrations on startup

For complete feature details, see the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#features).

## Architecture

This application is built using:

- **NestJS** - Progressive Node.js framework
- **TypeORM** - Object-Relational Mapping for database operations
- **Keycloak** - Identity and access management
- **Socket.IO** - WebSocket communication
- **Docker** - Container management for agent execution

The application integrates the `@forepath/framework-backend-feature-agent-manager` library, which provides the core agent management functionality. See the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#architecture) for detailed architecture information.

## Usage

### Prerequisites

- Node.js 22.12.0 or higher
- PostgreSQL database
- Keycloak server (for HTTP authentication)
- Docker (for agent container management)

### Installation

```bash
# Install dependencies
npm install

# Build the application
nx build backend-agent-manager

# Run the application
nx serve backend-agent-manager
```

### Database Migrations

The application automatically runs pending migrations on startup when `synchronize` is disabled in the TypeORM configuration. To use migrations:

1. Set `synchronize: false` in `typeorm.config.ts`
2. Create migration files in `src/migrations/`
3. Migrations will run automatically on application startup

## API Endpoints

All HTTP endpoints are prefixed with `/api` and protected by Keycloak authentication.

For complete API endpoint documentation, request/response schemas, and authentication requirements, see the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#api-endpoints).

## WebSocket Gateway

The WebSocket gateway is available at `ws://localhost:8080/agents` (or configured `WEBSOCKET_PORT`).

For complete WebSocket event specifications, authentication flow, and usage examples, see the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#websocket-gateway).

## Authentication

### HTTP Endpoints

All HTTP endpoints are protected by Keycloak authentication. For detailed authentication requirements, see the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#authentication).

### WebSocket Gateway

The WebSocket gateway uses database-backed authentication. See the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#authentication) for authentication details.

## Database Setup

The application uses TypeORM and requires a database connection to be configured. See the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#database-setup) for database setup requirements and entity schema.

## Testing

Run unit tests:

```bash
nx test backend-agent-manager
```

For library testing information, see the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#testing).

## Security Considerations

For security best practices and considerations, see the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#security-considerations).

## Environment Variables

See the [library documentation](../../libs/domains/framework/backend/feature-agent-manager/README.md#environment-variables) for complete environment variable documentation.

**Application-specific:**

- `PORT` - HTTP API port (default: `3000`)
- `NODE_ENV` - Environment mode (`development` or `production`)

## Docker Deployment

The application includes Dockerfiles for containerized deployment:

```bash
# Build API container
nx docker:api backend-agent-manager

# Build worker container
nx docker:worker backend-agent-manager
```

### Running the Container

When running the API container, you must mount the Docker socket to enable Docker-in-Docker functionality for agent container management:

```bash
# Run with Docker socket mount
docker run -v /var/run/docker.sock:/var/run/docker.sock \
  -p 3000:3000 \
  -p 8080:8080 \
  backend-agent-manager:api
```

**Important**: The `/var/run/docker.sock` mount is required for the application to manage agent containers. Without this mount, the Docker CLI installed in the container will not be able to communicate with the host Docker daemon.

## License

This application is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Copyright (c) 2025 IPvX UG (haftungsbeschränkt)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [GNU Affero General Public License](https://www.gnu.org/licenses/agpl-3.0.html) for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

**Note**: This component is sublicensed under AGPL-3.0, while the rest of the project remains under the MIT License. This means that any modifications or derivative works of this application must also be licensed under AGPL-3.0 and made available to users, including when accessed over a network.
