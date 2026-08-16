import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AgentConsoleRegexFilterRuleClientEntity } from '../entities/agent-console-regex-filter-rule-client.entity';
import { AgentConsoleRegexFilterRuleSyncTargetEntity } from '../entities/agent-console-regex-filter-rule-sync-target.entity';
import { AgentConsoleRegexFilterRuleEntity } from '../entities/agent-console-regex-filter-rule.entity';
import { ClientsRepository } from '../repositories/clients.repository';

import { AgentManagerFilterRulesClientService } from './agent-manager-filter-rules-client.service';
import { AgenstraNotificationPublisher } from '../notifications/agenstra-notification.publisher';
import { AgenstraSearchIndexService } from '../search/agenstra-search-index.service';

import { FilterRulesService } from './filter-rules.service';

describe('FilterRulesService', () => {
  const rulesRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const linksRepo = { save: jest.fn(), delete: jest.fn() };
  const targetsRepo = {
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
  };
  const clientsRepository = { findAllIds: jest.fn().mockResolvedValue(['c1']), findByIdOrThrow: jest.fn() };
  const amClient = { deleteRule: jest.fn().mockResolvedValue(undefined) };
  const searchIndex = {
    upsertSafe: jest.fn().mockResolvedValue(undefined),
    deleteSafe: jest.fn().mockResolvedValue(undefined),
    isEnabled: jest.fn().mockReturnValue(false),
    searchIds: jest.fn(),
  };
  let service: FilterRulesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    searchIndex.isEnabled.mockReturnValue(false);
    const m = await Test.createTestingModule({
      providers: [
        FilterRulesService,
        { provide: getRepositoryToken(AgentConsoleRegexFilterRuleEntity), useValue: rulesRepo },
        { provide: getRepositoryToken(AgentConsoleRegexFilterRuleClientEntity), useValue: linksRepo },
        { provide: getRepositoryToken(AgentConsoleRegexFilterRuleSyncTargetEntity), useValue: targetsRepo },
        { provide: ClientsRepository, useValue: clientsRepository },
        { provide: AgentManagerFilterRulesClientService, useValue: amClient },
        {
          provide: AgenstraNotificationPublisher,
          useValue: {
            publishFilterRule: jest.fn(),
            publishClient: jest.fn(),
            publishTicket: jest.fn(),
            publish: jest.fn(),
          },
        },
        {
          provide: AgenstraSearchIndexService,
          useValue: searchIndex,
        },
      ],
    }).compile();

    service = m.get(FilterRulesService);
  });

  it('create rejects non-global without workspaceIds', async () => {
    await expect(
      service.create({
        pattern: 'a',
        direction: 'incoming',
        filterType: 'none',
        isGlobal: false,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findAll requests pagination from the repository', async () => {
    rulesRepo.find.mockResolvedValue([]);
    await service.findAll(25, 5);
    expect(rulesRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 25,
        skip: 5,
      }),
    );
  });

  it('findAll uses searchIds when OpenSearch is enabled', async () => {
    searchIndex.isEnabled.mockReturnValue(true);
    searchIndex.searchIds
      .mockResolvedValueOnce({ ids: ['rule-1'], total: 1 })
      .mockResolvedValueOnce({ ids: [], total: 0 });
    rulesRepo.find.mockResolvedValue([
      {
        id: 'rule-1',
        pattern: 'foo',
        regexFlags: 'g',
        direction: 'incoming',
        filterType: 'none',
        replaceContent: null,
        priority: 0,
        enabled: true,
        isGlobal: true,
        clientLinks: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ]);
    targetsRepo.find.mockResolvedValue([]);

    await service.findAll(10, 0, 'foo');

    expect(searchIndex.searchIds).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'filter-rules',
        query: 'foo',
        clientIds: ['c1'],
      }),
    );
    expect(searchIndex.searchIds).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'filter-rules',
        query: 'foo',
        instanceScoped: true,
      }),
    );
  });
});
