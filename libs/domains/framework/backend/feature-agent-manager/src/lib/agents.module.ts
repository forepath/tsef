import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller';
import { AgentsFilesController } from './agents-files.controller';
import { AgentsGateway } from './agents.gateway';
import { ConfigController } from './config.controller';
import { AgentMessageEntity } from './entities/agent-message.entity';
import { AgentEntity } from './entities/agent.entity';
import { AgentMessagesRepository } from './repositories/agent-messages.repository';
import { AgentsRepository } from './repositories/agents.repository';
import { AgentFileSystemService } from './services/agent-file-system.service';
import { AgentMessagesService } from './services/agent-messages.service';
import { AgentsService } from './services/agents.service';
import { ConfigService } from './services/config.service';
import { DockerService } from './services/docker.service';
import { PasswordService } from './services/password.service';

/**
 * Module for agent management feature.
 * Provides controllers, services, and repository for agent CRUD operations and file system operations.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AgentEntity, AgentMessageEntity])],
  controllers: [AgentsController, AgentsFilesController, ConfigController],
  providers: [
    AgentsGateway,
    AgentsService,
    AgentMessagesService,
    AgentFileSystemService,
    ConfigService,
    PasswordService,
    AgentsRepository,
    AgentMessagesRepository,
    DockerService,
  ],
  exports: [AgentsService, AgentMessagesService, AgentsRepository, AgentMessagesRepository],
})
export class AgentsModule {}
