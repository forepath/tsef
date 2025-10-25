import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface LoginPayload {
  agentId: string;
  password: string;
}

interface ChatPayload {
  message: string;
}

@WebSocketGateway(8080, {
  namespace: 'agents',
  cors: {
    origin: '*', // adjust for production
  },
})
export class AgentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Store authenticated agents by socket.id
  private authenticatedClients = new Map<string, string>(); // socket.id -> agentId

  // Example hardcoded credentials (replace with DB or AuthService)
  private validAgents = {
    agent001: 'secret123',
    agent002: 'password456',
  };

  handleConnection(socket: Socket) {
    console.log(`Client connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    console.log(`Client disconnected: ${socket.id}`);
    this.authenticatedClients.delete(socket.id);
  }

  @SubscribeMessage('login')
  handleLogin(@MessageBody() data: LoginPayload, @ConnectedSocket() socket: Socket) {
    const { agentId, password } = data;

    const validPassword = this.validAgents[agentId];
    if (validPassword && validPassword === password) {
      this.authenticatedClients.set(socket.id, agentId);
      socket.emit('loginSuccess', { message: `Welcome, ${agentId}!` });
      console.log(`Agent ${agentId} authenticated on socket ${socket.id}`);
    } else {
      socket.emit('loginError', { message: 'Invalid credentials' });
      console.warn(`Failed login attempt for agent: ${agentId}`);
    }
  }

  @SubscribeMessage('chat')
  handleChat(@MessageBody() data: ChatPayload, @ConnectedSocket() socket: Socket) {
    const agentId = this.authenticatedClients.get(socket.id);
    if (!agentId) {
      socket.emit('error', { message: 'Unauthorized. Please login first.' });
      return;
    }

    const message = data.message.trim();
    if (!message) return;

    console.log(`Agent ${agentId} says: ${message}`);
    this.server.emit('chatMessage', { from: agentId, text: message });
  }
}
