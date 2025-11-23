import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientAgentCredentialEntity } from '../entities/client-agent-credential.entity';
import { ClientAgentCredentialsRepository } from './client-agent-credentials.repository';

describe('ClientAgentCredentialsRepository', () => {
  let module: TestingModule;
  let repo: ClientAgentCredentialsRepository;
  let ormRepo: jest.Mocked<Repository<ClientAgentCredentialEntity>>;

  const mockOrmRepo: Partial<jest.Mocked<Repository<ClientAgentCredentialEntity>>> = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ClientAgentCredentialsRepository,
        {
          provide: getRepositoryToken(ClientAgentCredentialEntity),
          useValue: mockOrmRepo,
        },
      ],
    }).compile();

    repo = module.get(ClientAgentCredentialsRepository);
    ormRepo = module.get(getRepositoryToken(ClientAgentCredentialEntity));
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should create and save credentials', async () => {
    const dto = {
      clientId: 'c-uuid',
      agentId: 'a-uuid',
      password: 'pass',
    };
    const entity = { ...dto } as ClientAgentCredentialEntity;
    ormRepo.create.mockReturnValue(entity);
    ormRepo.save.mockResolvedValue(entity);

    const result = await repo.create(dto);
    expect(ormRepo.create).toHaveBeenCalledWith(dto);
    expect(ormRepo.save).toHaveBeenCalledWith(entity);
    expect(result).toBe(entity);
  });

  it('should find by client and agent', async () => {
    const entity = { clientId: 'c', agentId: 'a' } as ClientAgentCredentialEntity;
    ormRepo.findOne.mockResolvedValue(entity);
    const result = await repo.findByClientAndAgent('c', 'a');
    expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { clientId: 'c', agentId: 'a' } });
    expect(result).toBe(entity);
  });

  it('should delete by client and agent when existing', async () => {
    const entity = { clientId: 'c', agentId: 'a' } as ClientAgentCredentialEntity;
    ormRepo.findOne.mockResolvedValue(entity);
    ormRepo.remove.mockResolvedValue(entity);
    await repo.deleteByClientAndAgent('c', 'a');
    expect(ormRepo.remove).toHaveBeenCalledWith(entity);
  });

  it('should handle delete when none existing', async () => {
    ormRepo.findOne.mockResolvedValue(null as any);
    await repo.deleteByClientAndAgent('c', 'a');
    expect(ormRepo.remove).not.toHaveBeenCalled();
  });
});
