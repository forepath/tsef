import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsFilesController } from './agents-files.controller';
import { AgentsVcsController } from './agents-vcs.controller';
import { AgentsController } from './agents.controller';
import { AgentsGateway } from './agents.gateway';
import { ConfigController } from './config.controller';
import { AgentMessageEntity } from './entities/agent-message.entity';
import { AgentEntity } from './entities/agent.entity';
import { AgentProviderFactory } from './providers/agent-provider.factory';
import { CursorAgentProvider } from './providers/agents/cursor-agent.provider';
import { ChatFilterFactory } from './providers/chat-filter.factory';
import { BidirectionalChatFilter } from './providers/filters/bidirectional-chat-filter';
import { IncomingChatFilter } from './providers/filters/incoming-chat-filter';
import { NoopChatFilter } from './providers/filters/noop-chat-filter';
import { OutgoingChatFilter } from './providers/filters/outgoing-chat-filter';
import { AgentMessagesRepository } from './repositories/agent-messages.repository';
import { AgentsRepository } from './repositories/agents.repository';
import { AgentFileSystemService } from './services/agent-file-system.service';
import { AgentMessagesService } from './services/agent-messages.service';
import { AgentsVcsService } from './services/agents-vcs.service';
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
  controllers: [AgentsController, AgentsFilesController, AgentsVcsController, ConfigController],
  providers: [
    AgentsGateway,
    AgentsService,
    AgentMessagesService,
    AgentFileSystemService,
    AgentsVcsService,
    ConfigService,
    PasswordService,
    AgentsRepository,
    AgentMessagesRepository,
    DockerService,
    AgentProviderFactory,
    CursorAgentProvider,
    ChatFilterFactory,
    NoopChatFilter,
    IncomingChatFilter,
    OutgoingChatFilter,
    BidirectionalChatFilter,
    {
      provide: 'AGENT_PROVIDER_INIT',
      useFactory: (factory: AgentProviderFactory, cursorProvider: CursorAgentProvider) => {
        factory.registerProvider(cursorProvider);
        return true;
      },
      inject: [AgentProviderFactory, CursorAgentProvider],
    },
    {
      provide: 'CHAT_FILTER_INIT',
      useFactory: (
        factory: ChatFilterFactory,
        noopFilter: NoopChatFilter,
        incomingFilter: IncomingChatFilter,
        outgoingFilter: OutgoingChatFilter,
        bidirectionalFilter: BidirectionalChatFilter,
      ) => {
        factory.registerFilter(noopFilter);
        factory.registerFilter(incomingFilter);
        factory.registerFilter(outgoingFilter);
        factory.registerFilter(bidirectionalFilter);
        return true;
      },
      inject: [ChatFilterFactory, NoopChatFilter, IncomingChatFilter, OutgoingChatFilter, BidirectionalChatFilter],
    },
  ],
  exports: [AgentsService, AgentMessagesService, AgentsRepository, AgentMessagesRepository],
})
export class AgentsModule {}
