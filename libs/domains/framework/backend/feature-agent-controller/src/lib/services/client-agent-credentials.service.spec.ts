import { Test, TestingModule } from '@nestjs/testing';
import { ClientAgentCredentialsRepository } from '../repositories/client-agent-credentials.repository';
import { ClientAgentCredentialsService } from './client-agent-credentials.service';

describe('ClientAgentCredentialsService', () => {
  let module: TestingModule;
  let service: ClientAgentCredentialsService;
  let repo: jest.Mocked<ClientAgentCredentialsRepository>;

  const mockRepo = {
    create: jest.fn(),
    deleteByClientAndAgent: jest.fn(),
    findByClientAndAgent: jest.fn(),
    findAgentIdsByClient: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [ClientAgentCredentialsService, { provide: ClientAgentCredentialsRepository, useValue: mockRepo }],
    }).compile();

    service = module.get(ClientAgentCredentialsService);
    repo = module.get(ClientAgentCredentialsRepository);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should save credentials', async () => {
    const dto = { clientId: 'c', agentId: 'a', password: 'p' };
    const saved = { id: 'x', ...dto };
    repo.create.mockResolvedValue(saved as any);
    const result = await service.saveCredentials(dto.clientId, dto.agentId, dto.password);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(saved);
  });

  it('should delete credentials', async () => {
    await service.deleteCredentials('c', 'a');
    expect(repo.deleteByClientAndAgent).toHaveBeenCalledWith('c', 'a');
  });

  it('should check if credentials exist - returns true when credentials exist', async () => {
    const credential = { id: 'x', clientId: 'c', agentId: 'a', password: 'p' };
    repo.findByClientAndAgent.mockResolvedValue(credential as any);
    const result = await service.hasCredentials('c', 'a');
    expect(repo.findByClientAndAgent).toHaveBeenCalledWith('c', 'a');
    expect(result).toBe(true);
  });

  it('should check if credentials exist - returns false when credentials do not exist', async () => {
    repo.findByClientAndAgent.mockResolvedValue(null);
    const result = await service.hasCredentials('c', 'a');
    expect(repo.findByClientAndAgent).toHaveBeenCalledWith('c', 'a');
    expect(result).toBe(false);
  });

  it('should get agent IDs with credentials for a client', async () => {
    const agentIds = ['agent-1', 'agent-2', 'agent-3'];
    repo.findAgentIdsByClient.mockResolvedValue(agentIds);
    const result = await service.getAgentIdsWithCredentials('c');
    expect(repo.findAgentIdsByClient).toHaveBeenCalledWith('c');
    expect(result).toEqual(agentIds);
  });
});
