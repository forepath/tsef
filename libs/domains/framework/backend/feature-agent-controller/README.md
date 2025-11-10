# framework-backend-feature-agent-controller

Client management feature library for backend applications providing HTTP REST API for managing clients and proxying agent operations to remote agent-manager services, plus WebSocket gateway for event forwarding.

## Purpose

This library enables the management of clients that connect to remote agent-manager services. It provides:

- **HTTP REST API** for CRUD operations on clients (create, read, update, delete)
- **HTTP REST API** for proxied agent operations (create, read, update, delete agents via client endpoints)
- **WebSocket Gateway** for real-time bidirectional event forwarding to remote agent-manager WebSocket endpoints
- **Authentication Support** for both API key and Keycloak OAuth2 Client Credentials flow
- **Credential Management** for storing agent credentials to enable WebSocket auto-login

Clients are entities that represent remote agent-manager services. The controller proxies HTTP requests to these services and forwards WebSocket events, enabling centralized management of distributed agent-manager instances.

## Features

- ✅ Auto-generated UUID primary keys
- ✅ Auto-generated API keys for API_KEY authentication type
- ✅ Keycloak OAuth2 Client Credentials flow support with token caching
- ✅ HTTP REST API with Keycloak authentication
- ✅ WebSocket gateway for event forwarding to remote agent-manager services
- ✅ Automatic agent login using stored credentials
- ✅ Support for configurable agent WebSocket ports per client
- ✅ Credential storage for proxied agent operations

## Architecture

The library follows Domain-Driven Design (DDD) principles with clear separation of concerns:

- **Entities**:
  - `ClientEntity` - Domain model representing a client (remote agent-manager service)
  - `ClientAgentCredentialEntity` - Stores credentials for agents created via proxied requests
- **Repositories**:
  - `ClientsRepository` - Data access layer for client operations
  - `ClientAgentCredentialsRepository` - Data access layer for agent credentials
- **Services**:
  - `ClientsService` - Business logic orchestration for clients
  - `ClientAgentProxyService` - Proxies HTTP requests to remote agent-manager services
  - `ClientAgentCredentialsService` - Manages stored agent credentials
  - `KeycloakTokenService` - Handles Keycloak OAuth2 Client Credentials flow with token caching
- **DTOs**: Data transfer objects for API boundaries
  - `CreateClientDto` - Input validation for creating clients
  - `UpdateClientDto` - Input validation for updating clients
  - `ClientResponseDto` - Safe API responses (excludes sensitive data)
  - `CreateClientResponseDto` - Response when creating client (includes API key if applicable)
- **Controllers**: `ClientsController` - HTTP endpoints for client and proxied agent management (protected by Keycloak)
- **Gateways**: `ClientsGateway` - WebSocket gateway for forwarding events to remote agent-manager WebSocket endpoints
- **Modules**: `ClientsModule` - NestJS module wiring all dependencies

## Documentation

### API Specifications

- **[OpenAPI 3.1 Specification](./spec/openapi.yaml)** - Complete HTTP REST API specification with request/response schemas, authentication requirements, and endpoint documentation
- **[AsyncAPI 3.0.0 Specification](./spec/asyncapi.yaml)** - WebSocket gateway specification with event definitions, message schemas, and channel documentation

### Visual Diagrams

All diagrams are available in the [`docs/`](./docs/) directory:

- **[Overview Diagram](./docs/overview.mmd)** - High-level flowchart showing HTTP REST API for clients, proxied agent operations, and WebSocket event forwarding
- **[HTTP Sequence Diagram](./docs/sequence-http.mmd)** - Detailed sequence diagram for all HTTP CRUD operations (client management and proxied agent operations)
- **[WebSocket Forwarding Diagram](./docs/sequence-ws-forward.mmd)** - Sequence diagram for WebSocket connection, client context setup, event forwarding, and auto-login
- **[Lifecycle Diagram](./docs/lifecycle.mmd)** - End-to-end sequence diagram showing the complete lifecycle from client creation through proxied agent operations to WebSocket event forwarding

These diagrams provide comprehensive visual documentation of:

- Component interactions and data flow
- Error handling and edge cases
- Authentication and authorization flows (API key and Keycloak)
- Real-time communication patterns
- Proxying and forwarding mechanisms

## Usage

### Import the Module

```typescript
import { ClientsModule } from '@forepath/framework/backend';

@Module({
  imports: [ClientsModule],
})
export class AppModule {}
```

### Use the Service

```typescript
import { ClientsService } from '@forepath/framework/backend';

@Injectable()
export class MyService {
  constructor(private readonly clientsService: ClientsService) {}

  async createClient(name: string, endpoint: string) {
    const result = await this.clientsService.create({
      name,
      endpoint,
      authenticationType: 'api_key',
    });
    // result.apiKey contains the auto-generated API key (if API_KEY type)
    return result;
  }
}
```

## API Endpoints

All HTTP endpoints require authentication via Keycloak. The `ClientsController` uses:

- `@Resource('clients')` decorator for resource-based authorization
- Global Keycloak guards (`AuthGuard`, `ResourceGuard`, `RoleGuard`)

Clients must include a valid Keycloak JWT bearer token in the `Authorization` header:

```
Authorization: Bearer <keycloak-jwt-token>
```

Base URL: `/api/clients`

### Client Management

- `GET /api/clients` - List all clients (supports `limit` and `offset` query parameters)
- `GET /api/clients/:id` - Get a single client by UUID
- `POST /api/clients` - Create a new client (returns API key if API_KEY authentication type)
- `POST /api/clients/:id` - Update an existing client
- `DELETE /api/clients/:id` - Delete a client

### Proxied Agent Operations

- `GET /api/clients/:id/agents` - List all agents for a client (supports `limit` and `offset` query parameters)
- `GET /api/clients/:id/agents/:agentId` - Get a single agent by UUID
- `POST /api/clients/:id/agents` - Create a new agent for a client (returns auto-generated password, saves credentials)
- `POST /api/clients/:id/agents/:agentId` - Update an existing agent
- `DELETE /api/clients/:id/agents/:agentId` - Delete an agent (also deletes stored credentials)

See the [OpenAPI specification](./spec/openapi.yaml) for detailed request/response schemas.

## WebSocket Gateway

The `ClientsGateway` provides WebSocket-based real-time event forwarding to remote agent-manager WebSocket endpoints:

- **Namespace**: `/clients`
- **Port**: `8081` (configurable via `WEBSOCKET_PORT` environment variable)
- **CORS**: Configured for development (adjust for production)

### Events

#### Client → Server

- `setClient` - Set the client context for subsequent operations

  ```typescript
  {
    clientId: string; // Client UUID
  }
  ```

- `forward` - Forward an event to the remote agent-manager WebSocket

  ```typescript
  {
    event: string; // Event name (e.g., "chat", "login", "logout")
    payload: unknown; // Event payload
    agentId?: string; // Optional agent UUID for auto-login
  }
  ```

  **Restoring Chat History**: To restore chat history for an agent, forward a "login" event with `agentId`. The `payload` field is optional and ignored - credentials are automatically loaded from the database. This triggers login which causes the agents gateway to restore and emit all chat history as `chatMessage` events:

  ```typescript
  socket.emit('forward', {
    event: 'login',
    agentId: 'agent-uuid',
    // payload is optional and ignored - credentials loaded from database
  });
  ```

#### Server → Client

- `setClientSuccess` - Emitted when client context is successfully set

  ```typescript
  {
    message: string; // "Client context set"
    clientId: string; // Selected client UUID
  }
  ```

- `forwardAck` - Acknowledgement for forwarded events

  ```typescript
  {
    received: boolean;
    event: string; // Event name that was forwarded
  }
  ```

- `error` - Emitted on errors

  ```typescript
  {
    message: string; // Error message
  }
  ```

- All events from the remote agent-manager WebSocket are forwarded back to the client via `onAny()` handler

See the [AsyncAPI specification](./spec/asyncapi.yaml) for complete event documentation.

### WebSocket Authentication

The gateway authenticates with remote agent-manager services using:

- **API Key**: If client authentication type is `API_KEY`, uses the client's stored API key
- **Keycloak JWT**: If client authentication type is `KEYCLOAK`, fetches and caches a JWT token using OAuth2 Client Credentials flow

When forwarding events with an `agentId`, the gateway automatically logs in the agent using stored credentials (saved when agents are created via proxied HTTP requests).

### Example WebSocket Client

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8081/clients');

socket.on('connect', () => {
  // Set client context
  socket.emit('setClient', {
    clientId: 'client-uuid',
  });
});

socket.on('setClientSuccess', (data) => {
  console.log(data.message); // "Client context set"

  // Restore chat history for an agent
  socket.emit('forward', {
    event: 'login',
    agentId: 'agent-uuid',
    // payload is optional and ignored - credentials loaded from database
  });

  // After login, chat history will be restored via chatMessage events
  // Then forward a chat event
  socket.emit('forward', {
    event: 'chat',
    payload: { message: 'Hello, world!' },
    agentId: 'agent-uuid', // Optional: triggers auto-login if not already logged in
  });
});

socket.on('forwardAck', (data) => {
  console.log(`Event ${data.event} forwarded`);
});

// Receive forwarded events from remote agent-manager
socket.on('chatMessage', (data) => {
  console.log('Chat message:', data);
});

socket.on('error', (data) => {
  console.error('Error:', data.message);
});
```

## Authentication

### HTTP Endpoints

All HTTP endpoints are protected by Keycloak authentication. The `ClientsController` uses:

- `@Resource('clients')` decorator for resource-based authorization
- Global Keycloak guards (`AuthGuard`, `ResourceGuard`, `RoleGuard`)

Clients must include a valid Keycloak JWT bearer token in the `Authorization` header:

```
Authorization: Bearer <keycloak-jwt-token>
```

### Client Authentication Types

Clients can authenticate with remote agent-manager services using two methods:

#### API Key Authentication

- Set `authenticationType` to `API_KEY` when creating a client
- Provide an `apiKey` (or let the system auto-generate one)
- The API key is used in the `Authorization: Bearer <api-key>` header when proxying requests

#### Keycloak OAuth2 Client Credentials

- Set `authenticationType` to `KEYCLOAK` when creating a client
- Provide `keycloakClientId`, `keycloakClientSecret`, and `keycloakRealm`
- The system fetches a JWT token using OAuth2 Client Credentials flow
- Tokens are cached and automatically refreshed when expired
- The JWT token is used in the `Authorization: Bearer <jwt-token>` header when proxying requests

### WebSocket Gateway

The WebSocket gateway authenticates with remote agent-manager services using the client's configured authentication method (API key or Keycloak JWT). When forwarding events with an `agentId`, the gateway automatically logs in the agent using stored credentials.

## Dependencies

This library requires the following dependencies:

- `@nestjs/typeorm` - TypeORM integration for NestJS
- `typeorm` - TypeORM ORM library
- `class-validator` - Input validation decorators
- `class-transformer` - Object transformation utilities
- `@nestjs/websockets` - WebSocket support for NestJS
- `socket.io` - WebSocket library
- `socket.io-client` - Socket.IO client for connecting to remote agent-manager WebSocket endpoints
- `nest-keycloak-connect` - Keycloak integration for NestJS
- `axios` - HTTP client for proxying requests to remote agent-manager services

## Database Setup

The library uses TypeORM and requires a database connection to be configured in your application:

1. Configure TypeORM connection in your application module
2. Run database migrations to create the `clients` and `client_agent_credentials` tables
3. Ensure the database supports UUID primary keys

The `ClientEntity` includes:

- `id` (UUID, primary key)
- `name` (string, required, unique)
- `description` (string, optional)
- `endpoint` (string, required - URL of remote agent-manager service)
- `authenticationType` (enum: `API_KEY` or `KEYCLOAK`)
- `apiKey` (string, optional - for API_KEY authentication)
- `keycloakClientId` (string, optional - for KEYCLOAK authentication)
- `keycloakClientSecret` (string, optional - for KEYCLOAK authentication)
- `keycloakRealm` (string, optional - for KEYCLOAK authentication)
- `agentWsPort` (integer, optional - WebSocket port for remote agent-manager, defaults to `CLIENTS_REMOTE_WS_PORT` env var or 8080)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

The `ClientAgentCredentialEntity` includes:

- `id` (UUID, primary key)
- `clientId` (UUID, foreign key to `clients.id`, CASCADE delete)
- `agentId` (UUID - agent UUID from remote agent-manager)
- `password` (string - agent password for WebSocket auto-login)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- Unique constraint on `(clientId, agentId)`

## Testing

Run unit tests:

```bash
nx test framework-backend-feature-agent-controller
```

Run tests with coverage:

```bash
nx test framework-backend-feature-agent-controller --coverage
```

## Security Considerations

- **API Key Security**: API keys are auto-generated using cryptographically secure random bytes
- **Sensitive Data**: API keys, Keycloak secrets, and agent passwords are never exposed in standard API responses
- **Input Validation**: All DTOs use class-validator for input validation
- **HTTP Authentication**: All HTTP endpoints are protected by Keycloak
- **WebSocket Authentication**: WebSocket authentication uses client's configured authentication method (API key or Keycloak JWT)
- **Token Caching**: Keycloak tokens are cached with expiration tracking to minimize token requests
- **Credential Storage**: Agent credentials are stored securely in the database for WebSocket auto-login
- **Error Messages**: Generic error messages are used to prevent information disclosure
- **Session Management**: WebSocket sessions are stored in memory and cleaned up on disconnect

## Environment Variables

### Backend API Environment Variables

- `WEBSOCKET_PORT` - Port for WebSocket gateway (default: `8081`)
- `CLIENTS_REMOTE_WS_PORT` - Default WebSocket port for remote agent-manager services (default: `8080`, can be overridden per client via `agentWsPort`)
- `KEYCLOAK_AUTH_SERVER_URL` - Keycloak server URL (required for Keycloak-authenticated clients)
- `KEYCLOAK_REALM` - Keycloak realm (required for Keycloak-authenticated clients)
- `KEYCLOAK_CLIENT_ID` - Keycloak client ID (required for HTTP authentication)
- `KEYCLOAK_CLIENT_SECRET` - Keycloak client secret (required for HTTP authentication)

## License

This library is licensed under the **Business Source License 1.1 (BUSL-1.1)**.

Copyright (c) 2025 IPvX UG (haftungsbeschränkt)

See the [LICENSE](./LICENSE) file for full license text.

**Note**: This component is sublicensed under BUSL-1.1, while the rest of the project remains under the MIT License.
