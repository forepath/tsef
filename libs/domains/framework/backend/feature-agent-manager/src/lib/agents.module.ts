import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller';
import { AgentsGateway } from './agents.gateway';
import { AgentEntity } from './entities/agent.entity';
import { AgentsRepository } from './repositories/agents.repository';
import { AgentsService } from './services/agents.service';
import { DockerService } from './services/docker.service';
import { PasswordService } from './services/password.service';

/**
 * Module for agent management feature.
 * Provides controllers, services, and repository for agent CRUD operations.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AgentEntity])],
  controllers: [AgentsController],
  providers: [AgentsGateway, AgentsService, PasswordService, AgentsRepository, DockerService],
  exports: [AgentsService, AgentsRepository],
})
export class AgentsModule {}
