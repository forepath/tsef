# framework-backend-feature-agent-manager

Agent management feature library for backend applications providing HTTP REST API and WebSocket gateway for managing and interacting with agents.

## Purpose

This library enables the creation, management, and real-time interaction with agents in the system. It provides:

- **HTTP REST API** for CRUD operations on agents (create, read, update, delete)
- **WebSocket Gateway** for real-time bidirectional communication with agents
- **Container Integration** for streaming logs and sending commands to agent containers
- **Secure Authentication** using database-backed credentials with bcrypt password hashing

Agents are entities that can be created, authenticated, and interacted with through both synchronous HTTP requests and persistent WebSocket connections for real-time communication and log streaming.

## Features

- ✅ Auto-generated UUID primary keys
- ✅ Secure password generation and hashing (bcrypt)
- ✅ HTTP REST API with Keycloak authentication
- ✅ WebSocket gateway with database-backed authentication
- ✅ Real-time container log streaming
- ✅ Chat message broadcasting
- ✅ Container command forwarding
- ✅ Support for UUID or name-based agent identification

## Architecture

The library follows Domain-Driven Design (DDD) principles with clear separation of concerns:

- **Entities**: `AgentEntity` - Domain model representing an agent
- **Repositories**: `AgentsRepository` - Data access layer abstracting database operations
- **Services**:
  - `AgentsService` - Business logic orchestration
  - `PasswordService` - Password hashing and verification
  - `DockerService` - Container log streaming and command execution
- **DTOs**: Data transfer objects for API boundaries
  - `CreateAgentDto` - Input validation for creating agents
  - `UpdateAgentDto` - Input validation for updating agents
  - `AgentResponseDto` - Safe API responses (excludes password hash)
  - `CreateAgentResponseDto` - Response when creating agent (includes auto-generated password)
- **Controllers**: `AgentsController` - HTTP endpoints for agent management (protected by Keycloak)
- **Gateways**: `AgentsGateway` - WebSocket gateway for agent chat with database-backed authentication
- **Modules**: `AgentsModule` - NestJS module wiring all dependencies

## Documentation

### API Specifications

- **[OpenAPI 3.1 Specification](./spec/openapi.yaml)** - Complete HTTP REST API specification with request/response schemas, authentication requirements, and endpoint documentation
- **[AsyncAPI 3.0.0 Specification](./spec/asyncapi.yaml)** - WebSocket gateway specification with event definitions, message schemas, and channel documentation

### Visual Diagrams

All diagrams are available in the [`docs/`](./docs/) directory:

- **[Overview Diagram](./docs/overview.mmd)** - High-level flowchart showing when to use HTTP vs WebSocket protocols and their respective use cases
- **[HTTP Sequence Diagram](./docs/sequence-http.mmd)** - Detailed sequence diagram for all HTTP CRUD operations (create, list, get, update, delete)
- **[WebSocket Auth & Logs Diagram](./docs/sequence-ws-auth-logs.mmd)** - Sequence diagram for WebSocket connection, authentication flow, and container log streaming
- **[WebSocket Chat Diagram](./docs/sequence-ws-chat.mmd)** - Sequence diagram for WebSocket chat message flow and disconnection handling
- **[Lifecycle Diagram](./docs/lifecycle.mmd)** - End-to-end sequence diagram showing the complete agent lifecycle from creation through deletion

These diagrams provide comprehensive visual documentation of:

- Component interactions and data flow
- Error handling and edge cases
- Authentication and authorization flows
- Real-time communication patterns

## Usage

### Import the Module

```typescript
import { AgentsModule } from '@forepath/framework/backend';

@Module({
  imports: [AgentsModule],
})
export class AppModule {}
```

### Use the Service

```typescript
import { AgentsService } from '@forepath/framework/backend';

@Injectable()
export class MyService {
  constructor(private readonly agentsService: AgentsService) {}

  async createAgent(name: string) {
    const result = await this.agentsService.create({
      name,
      description: 'My agent',
    });
    // result.password contains the auto-generated password
    return result;
  }
}
```

## API Endpoints

All HTTP endpoints require authentication. The authentication method depends on the `STATIC_API_KEY` environment variable:

- If `STATIC_API_KEY` is set: API key authentication (use `Bearer <static-api-key>` or `ApiKey <static-api-key>` in the `Authorization` header)
- If `STATIC_API_KEY` is not set: Keycloak authentication (use `Bearer <keycloak-jwt-token>` in the `Authorization` header)

Base URL: `/api/agents`

- `GET /api/agents` - List all agents (supports `limit` and `offset` query parameters)
- `GET /api/agents/:id` - Get a single agent by UUID
- `POST /api/agents` - Create a new agent (returns auto-generated password)
- `POST /api/agents/:id` - Update an existing agent
- `DELETE /api/agents/:id` - Delete an agent

See the [OpenAPI specification](./spec/openapi.yaml) for detailed request/response schemas.

## WebSocket Gateway

The `AgentsGateway` provides WebSocket-based real-time communication with database-backed authentication:

- **Namespace**: `/agents`
- **Port**: `8080` (configurable via `WEBSOCKET_PORT` environment variable)
- **CORS**: Configured for development (adjust for production)

### Events

#### Client → Server

- `login` - Authenticate with agent ID (UUID or name) and password

  ```typescript
  {
    agentId: string; // UUID or agent name
    password: string;
  }
  ```

- `chat` - Send chat message (requires authentication)
  ```typescript
  {
    message: string;
  }
  ```

#### Server → Client

- `loginSuccess` - Emitted on successful authentication

  ```typescript
  {
    message: string; // "Welcome, {agentName}!"
  }
  ```

- `loginError` - Emitted on authentication failure

  ```typescript
  {
    message: string; // "Invalid credentials"
  }
  ```

- `chatMessage` - Broadcasted to all connected clients when a chat message is sent

  ```typescript
  // User message
  {
    from: 'user';
    text: string; // Message text
    timestamp: string; // ISO timestamp
  }

  // Agent message
  {
    from: 'agent';
    response: AgentResponseObject | string; // Parsed JSON response object or raw string if parsing fails
    timestamp: string; // ISO timestamp
  }

  // AgentResponseObject structure:
  {
    type: string;
    subtype?: string;
    is_error?: boolean;
    duration_ms?: number;
    duration_api_ms?: number;
    result?: string;
    session_id?: string;
    request_id?: string;
  }
  ```

- `error` - Emitted on authorization or processing errors
  ```typescript
  {
    message: string;
  }
  ```

See the [AsyncAPI specification](./spec/asyncapi.yaml) for complete event documentation.

### WebSocket Authentication

Agents authenticate using their UUID or name along with their password. The gateway:

- Supports both UUID and agent name for login (tries UUID first, falls back to name)
- Stores authenticated sessions using agent UUIDs mapped to socket IDs
- Validates credentials against the database using bcrypt password verification
- Broadcasts chat messages with actor type (agent/user) to all connected clients
- Forwards chat messages to container stdin for command execution and captures responses

### Example WebSocket Client

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080/agents');

socket.on('connect', () => {
  // Login with agent ID (UUID or name) and password
  socket.emit('login', {
    agentId: 'agent-uuid-or-name',
    password: 'agent-password',
  });
});

socket.on('loginSuccess', (data) => {
  console.log(data.message); // "Welcome, Agent Name!"
});

socket.on('loginError', (data) => {
  console.error(data.message); // "Invalid credentials"
});

// Send chat message after authentication
socket.emit('chat', {
  message: 'Hello, world!',
});

socket.on('chatMessage', (data) => {
  console.log(`${data.from}: ${data.text}`); // "user: Hello, world!" or "agent: <response>"
});

socket.on('error', (data) => {
  console.error('Error:', data.message);
});
```

## Authentication

### HTTP Endpoints

HTTP endpoints support two authentication methods, determined by the `STATIC_API_KEY` environment variable:

#### Static API Key Authentication (when `STATIC_API_KEY` is set)

When `STATIC_API_KEY` is configured, all HTTP endpoints use API key authentication only (no Keycloak fallback, no anonymous access). Clients must include the static API key in the `Authorization` header using either format:

```
Authorization: Bearer <static-api-key>
```

or

```
Authorization: ApiKey <static-api-key>
```

#### Keycloak Authentication (when `STATIC_API_KEY` is not set)

When `STATIC_API_KEY` is not set, all HTTP endpoints are protected by Keycloak authentication. The `AgentsController` uses:

- `@Resource('agents')` decorator for resource-based authorization
- Global Keycloak guards (`AuthGuard`, `ResourceGuard`, `RoleGuard`)

Clients must include a valid Keycloak JWT bearer token in the `Authorization` header:

```
Authorization: Bearer <keycloak-jwt-token>
```

### WebSocket Gateway

The WebSocket gateway uses database-backed authentication:

- Agents authenticate using their UUID or name with password
- Credentials are validated against the database
- Sessions are stored in memory (socket.id → agent UUID mapping)
- Authentication is required before sending chat messages or receiving logs

## Dependencies

This library requires the following dependencies:

- `@nestjs/typeorm` - TypeORM integration for NestJS
- `typeorm` - TypeORM ORM library
- `bcrypt` - Password hashing library
- `@types/bcrypt` - TypeScript types for bcrypt
- `class-validator` - Input validation decorators
- `class-transformer` - Object transformation utilities
- `@nestjs/websockets` - WebSocket support for NestJS
- `socket.io` - WebSocket library
- `nest-keycloak-connect` - Keycloak integration for NestJS

## Database Setup

The library uses TypeORM and requires a database connection to be configured in your application:

1. Configure TypeORM connection in your application module
2. Run database migrations to create the `agents` table
3. Ensure the database supports UUID primary keys

The `AgentEntity` includes:

- `id` (UUID, primary key)
- `name` (string, required)
- `description` (string, optional)
- `hashedPassword` (string, bcrypt hash)
- `containerId` (string, optional - Docker container ID for agent container)
- `volumePath` (string, optional - Host path to agent volume where git repository is cloned)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

## Testing

Run unit tests:

```bash
nx test framework-backend-feature-agent-manager
```

Run tests with coverage:

```bash
nx test framework-backend-feature-agent-manager --coverage
```

## Security Considerations

- **Password Security**: Passwords are hashed using bcrypt with 10 salt rounds
- **API Security**: Password hashes are never exposed in API responses
- **Input Validation**: All DTOs use class-validator for input validation
- **HTTP Authentication**: All HTTP endpoints are protected by Keycloak
- **WebSocket Authentication**: WebSocket authentication validates credentials against the database
- **Error Messages**: Generic error messages are used to prevent information disclosure
- **Session Management**: WebSocket sessions are stored in memory and cleaned up on disconnect

## Environment Variables

### Backend API Environment Variables

- `WEBSOCKET_PORT` - Port for WebSocket gateway (default: `8080`)
- `KEYCLOAK_AUTH_SERVER_URL` - Keycloak server URL (required for HTTP authentication when `STATIC_API_KEY` is not set)
- `KEYCLOAK_REALM` - Keycloak realm (required for HTTP authentication when `STATIC_API_KEY` is not set)
- `KEYCLOAK_CLIENT_ID` - Keycloak client ID (required for HTTP authentication when `STATIC_API_KEY` is not set)
- `KEYCLOAK_CLIENT_SECRET` - Keycloak client secret (required for HTTP authentication when `STATIC_API_KEY` is not set)
- `STATIC_API_KEY` - Static API key for HTTP authentication (optional). If set, the API uses API key authentication only (no Keycloak fallback, no anonymous access). If not set, Keycloak authentication is used. The API key can be provided in the `Authorization` header using either `Bearer <key>` or `ApiKey <key>` format.
- `CURSOR_API_KEY` - Cursor API key for agent communication (required for agent containers)

### Git Repository Environment Variables

These environment variables are required for git repository cloning when creating agents:

- `GIT_REPOSITORY_URL` - HTTPS or SSH URL of the git repository to clone (e.g., `https://github.com/user/repo.git` or `git@github.com:user/repo.git`)
- `GIT_USERNAME` - Git username for authentication (**required for HTTPS URLs**)
- `GIT_TOKEN` - Git personal access token for authentication (preferred for HTTPS, or use `GIT_PASSWORD`)
- `GIT_PASSWORD` - Git password or token (alternative to `GIT_TOKEN` for HTTPS)
- `GIT_PRIVATE_KEY` - SSH private key for authentication (**required for SSH URLs**). Must be in PEM or OpenSSH format without a passphrase.

**HTTPS repositories**

1. Create a Docker container with `GIT_REPOSITORY_URL`, `GIT_USERNAME`, and `GIT_TOKEN` (or `GIT_PASSWORD`) environment variables
2. Create a `.netrc` file in the container for git authentication
3. Clone the repository directly into the container's `/app` directory (workdir)

**SSH repositories**

1. Set the `GIT_PRIVATE_KEY` environment variable with a valid SSH private key (PEM or OpenSSH format, no passphrase)
2. The service detects the key type (RSA, Ed25519, ECDSA, etc.) and writes the key to the appropriate filename in `/root/.ssh/` (e.g., `id_rsa`, `id_ed25519`, `id_ecdsa`) and bootstraps `known_hosts` using `ssh-keyscan`
3. If `GIT_PRIVATE_KEY` is not set or invalid, agent creation will fail with a `BadRequestException`
4. The SSH private key must be registered with your git provider (GitHub, GitLab, etc.) as a deploy key or user SSH key

## License

This library is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Copyright (c) 2025 IPvX UG (haftungsbeschränkt)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [GNU Affero General Public License](https://www.gnu.org/licenses/agpl-3.0.html) for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

**Note**: This component is sublicensed under AGPL-3.0, while the rest of the project remains under the MIT License. This means that any modifications or derivative works of this library must also be licensed under AGPL-3.0 and made available to users, including when accessed over a network.
