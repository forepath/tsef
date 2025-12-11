import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgentsController } from './agents.controller';
import { AgentsGateway } from './agents.gateway';
import { AgentsModule } from './agents.module';
import { AgentMessageEntity } from './entities/agent-message.entity';
import { AgentEntity } from './entities/agent.entity';
import { AgentProviderFactory } from './providers/agent-provider.factory';
import { CursorAgentProvider } from './providers/agents/cursor-agent.provider';
import { ChatFilterFactory } from './providers/chat-filter.factory';
import { BidirectionalChatFilter } from './providers/filters/bidirectional-chat-filter';
import { IncomingChatFilter } from './providers/filters/incoming-chat-filter';
import { NoopChatFilter } from './providers/filters/noop-chat-filter';
import { OutgoingChatFilter } from './providers/filters/outgoing-chat-filter';
import { AgentsRepository } from './repositories/agents.repository';
import { AgentsService } from './services/agents.service';
import { DockerService } from './services/docker.service';
import { PasswordService } from './services/password.service';

describe('AgentsModule', () => {
  let module: TestingModule;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AgentsModule],
    })
      .overrideProvider(getRepositoryToken(AgentEntity))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(AgentMessageEntity))
      .useValue(mockRepository)
      .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide AgentsService', () => {
    const service = module.get<AgentsService>(AgentsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(AgentsService);
  });

  it('should provide AgentsRepository', () => {
    const repository = module.get<AgentsRepository>(AgentsRepository);
    expect(repository).toBeDefined();
    expect(repository).toBeInstanceOf(AgentsRepository);
  });

  it('should provide PasswordService', () => {
    const service = module.get<PasswordService>(PasswordService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(PasswordService);
  });

  it('should provide DockerService', () => {
    const service = module.get<DockerService>(DockerService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(DockerService);
  });

  it('should provide AgentsController', () => {
    const controller = module.get<AgentsController>(AgentsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(AgentsController);
  });

  it('should provide AgentsGateway', () => {
    const gateway = module.get<AgentsGateway>(AgentsGateway);
    expect(gateway).toBeDefined();
    expect(gateway).toBeInstanceOf(AgentsGateway);
  });

  it('should export AgentsService', () => {
    const service = module.get<AgentsService>(AgentsService);
    expect(service).toBeDefined();
  });

  it('should export AgentsRepository', () => {
    const repository = module.get<AgentsRepository>(AgentsRepository);
    expect(repository).toBeDefined();
  });

  it('should provide AgentProviderFactory', () => {
    const factory = module.get<AgentProviderFactory>(AgentProviderFactory);
    expect(factory).toBeDefined();
    expect(factory).toBeInstanceOf(AgentProviderFactory);
  });

  it('should provide CursorAgentProvider', () => {
    const provider = module.get<CursorAgentProvider>(CursorAgentProvider);
    expect(provider).toBeDefined();
    expect(provider).toBeInstanceOf(CursorAgentProvider);
  });

  it('should register CursorAgentProvider via AGENT_PROVIDER_INIT factory', () => {
    const factory = module.get<AgentProviderFactory>(AgentProviderFactory);
    const cursorProvider = module.get<CursorAgentProvider>(CursorAgentProvider);

    // Verify the provider is registered
    expect(factory.hasProvider('cursor')).toBe(true);
    expect(factory.getProvider('cursor')).toBe(cursorProvider);
    expect(cursorProvider.getType()).toBe('cursor');
  });

  it('should initialize AGENT_PROVIDER_INIT factory', () => {
    const initValue = module.get<boolean>('AGENT_PROVIDER_INIT');
    expect(initValue).toBe(true);
  });

  it('should provide ChatFilterFactory', () => {
    const factory = module.get<ChatFilterFactory>(ChatFilterFactory);
    expect(factory).toBeDefined();
    expect(factory).toBeInstanceOf(ChatFilterFactory);
  });

  it('should provide NoopChatFilter', () => {
    const filter = module.get<NoopChatFilter>(NoopChatFilter);
    expect(filter).toBeDefined();
    expect(filter).toBeInstanceOf(NoopChatFilter);
  });

  it('should provide IncomingChatFilter', () => {
    const filter = module.get<IncomingChatFilter>(IncomingChatFilter);
    expect(filter).toBeDefined();
    expect(filter).toBeInstanceOf(IncomingChatFilter);
  });

  it('should provide OutgoingChatFilter', () => {
    const filter = module.get<OutgoingChatFilter>(OutgoingChatFilter);
    expect(filter).toBeDefined();
    expect(filter).toBeInstanceOf(OutgoingChatFilter);
  });

  it('should provide BidirectionalChatFilter', () => {
    const filter = module.get<BidirectionalChatFilter>(BidirectionalChatFilter);
    expect(filter).toBeDefined();
    expect(filter).toBeInstanceOf(BidirectionalChatFilter);
  });

  it('should register all filters via CHAT_FILTER_INIT factory', () => {
    const factory = module.get<ChatFilterFactory>(ChatFilterFactory);
    const noopFilter = module.get<NoopChatFilter>(NoopChatFilter);
    const incomingFilter = module.get<IncomingChatFilter>(IncomingChatFilter);
    const outgoingFilter = module.get<OutgoingChatFilter>(OutgoingChatFilter);
    const bidirectionalFilter = module.get<BidirectionalChatFilter>(BidirectionalChatFilter);

    // Verify all filters are registered
    expect(factory.hasFilter('noop')).toBe(true);
    expect(factory.getFilter('noop')).toBe(noopFilter);
    expect(noopFilter.getType()).toBe('noop');

    expect(factory.hasFilter('incoming-example')).toBe(true);
    expect(factory.getFilter('incoming-example')).toBe(incomingFilter);
    expect(incomingFilter.getType()).toBe('incoming-example');

    expect(factory.hasFilter('outgoing-example')).toBe(true);
    expect(factory.getFilter('outgoing-example')).toBe(outgoingFilter);
    expect(outgoingFilter.getType()).toBe('outgoing-example');

    expect(factory.hasFilter('bidirectional-example')).toBe(true);
    expect(factory.getFilter('bidirectional-example')).toBe(bidirectionalFilter);
    expect(bidirectionalFilter.getType()).toBe('bidirectional-example');
  });

  it('should initialize CHAT_FILTER_INIT factory', () => {
    const initValue = module.get<boolean>('CHAT_FILTER_INIT');
    expect(initValue).toBe(true);
  });
});
