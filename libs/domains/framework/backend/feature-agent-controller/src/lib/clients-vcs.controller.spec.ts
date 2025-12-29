import {
  CommitDto,
  CreateBranchDto,
  GitBranchDto,
  GitDiffDto,
  GitStatusDto,
  RebaseDto,
  ResolveConflictDto,
  StageFilesDto,
  UnstageFilesDto,
} from '@forepath/framework/backend/feature-agent-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientsVcsController } from './clients-vcs.controller';
import { ClientAgentVcsProxyService } from './services/client-agent-vcs-proxy.service';

describe('ClientsVcsController', () => {
  let controller: ClientsVcsController;
  let proxyService: jest.Mocked<ClientAgentVcsProxyService>;

  const mockProxyService = {
    getStatus: jest.fn(),
    getBranches: jest.fn(),
    getFileDiff: jest.fn(),
    stageFiles: jest.fn(),
    unstageFiles: jest.fn(),
    commit: jest.fn(),
    push: jest.fn(),
    pull: jest.fn(),
    fetch: jest.fn(),
    rebase: jest.fn(),
    switchBranch: jest.fn(),
    createBranch: jest.fn(),
    deleteBranch: jest.fn(),
    resolveConflict: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsVcsController],
      providers: [
        {
          provide: ClientAgentVcsProxyService,
          useValue: mockProxyService,
        },
      ],
    }).compile();

    controller = module.get<ClientsVcsController>(ClientsVcsController);
    proxyService = module.get(ClientAgentVcsProxyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should get git status', async () => {
      const mockStatus: GitStatusDto = {
        currentBranch: 'main',
        isClean: true,
        hasUnpushedCommits: false,
        aheadCount: 0,
        behindCount: 0,
        files: [],
      };

      proxyService.getStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStatus('client-uuid', 'agent-uuid');

      expect(result).toEqual(mockStatus);
      expect(proxyService.getStatus).toHaveBeenCalledWith('client-uuid', 'agent-uuid');
    });
  });

  describe('getBranches', () => {
    it('should list branches', async () => {
      const mockBranches: GitBranchDto[] = [
        {
          name: 'main',
          ref: 'refs/heads/main',
          isCurrent: true,
          isRemote: false,
          commit: 'abc123',
          message: 'Initial commit',
        },
        {
          name: 'develop',
          ref: 'refs/heads/develop',
          isCurrent: false,
          isRemote: false,
          commit: 'def456',
          message: 'Develop branch',
        },
      ];

      proxyService.getBranches.mockResolvedValue(mockBranches);

      const result = await controller.getBranches('client-uuid', 'agent-uuid');

      expect(result).toEqual(mockBranches);
      expect(proxyService.getBranches).toHaveBeenCalledWith('client-uuid', 'agent-uuid');
    });
  });

  describe('getFileDiff', () => {
    it('should get file diff', async () => {
      const mockDiff: GitDiffDto = {
        path: 'src/file.ts',
        originalContent: Buffer.from('old content').toString('base64'),
        modifiedContent: Buffer.from('new content').toString('base64'),
        encoding: 'utf-8',
        isBinary: false,
      };

      proxyService.getFileDiff.mockResolvedValue(mockDiff);

      const result = await controller.getFileDiff('client-uuid', 'agent-uuid', 'src/file.ts');

      expect(result).toEqual(mockDiff);
      expect(proxyService.getFileDiff).toHaveBeenCalledWith('client-uuid', 'agent-uuid', 'src/file.ts');
    });

    it('should throw error when file path is missing', async () => {
      await expect(controller.getFileDiff('client-uuid', 'agent-uuid', '')).rejects.toThrow('File path is required');
    });
  });

  describe('stageFiles', () => {
    it('should stage files', async () => {
      const dto: StageFilesDto = {
        files: ['src/file1.ts', 'src/file2.ts'],
      };

      proxyService.stageFiles.mockResolvedValue(undefined);

      await controller.stageFiles('client-uuid', 'agent-uuid', dto);

      expect(proxyService.stageFiles).toHaveBeenCalledWith('client-uuid', 'agent-uuid', dto);
    });
  });

  describe('unstageFiles', () => {
    it('should unstage files', async () => {
      const dto: UnstageFilesDto = {
        files: ['src/file1.ts'],
      };

      proxyService.unstageFiles.mockResolvedValue(undefined);

      await controller.unstageFiles('client-uuid', 'agent-uuid', dto);

      expect(proxyService.unstageFiles).toHaveBeenCalledWith('client-uuid', 'agent-uuid', dto);
    });
  });

  describe('commit', () => {
    it('should commit staged changes', async () => {
      const dto: CommitDto = {
        message: 'Test commit',
      };

      proxyService.commit.mockResolvedValue(undefined);

      await controller.commit('client-uuid', 'agent-uuid', dto);

      expect(proxyService.commit).toHaveBeenCalledWith('client-uuid', 'agent-uuid', dto);
    });
  });

  describe('push', () => {
    it('should push changes', async () => {
      const pushOptions = { force: false };

      proxyService.push.mockResolvedValue(undefined);

      await controller.push('client-uuid', 'agent-uuid', pushOptions);

      expect(proxyService.push).toHaveBeenCalledWith('client-uuid', 'agent-uuid', pushOptions);
    });

    it('should push with default empty options', async () => {
      proxyService.push.mockResolvedValue(undefined);

      await controller.push('client-uuid', 'agent-uuid');

      expect(proxyService.push).toHaveBeenCalledWith('client-uuid', 'agent-uuid', {});
    });
  });

  describe('pull', () => {
    it('should pull changes', async () => {
      proxyService.pull.mockResolvedValue(undefined);

      await controller.pull('client-uuid', 'agent-uuid');

      expect(proxyService.pull).toHaveBeenCalledWith('client-uuid', 'agent-uuid');
    });
  });

  describe('fetch', () => {
    it('should fetch changes', async () => {
      proxyService.fetch.mockResolvedValue(undefined);

      await controller.fetch('client-uuid', 'agent-uuid');

      expect(proxyService.fetch).toHaveBeenCalledWith('client-uuid', 'agent-uuid');
    });
  });

  describe('rebase', () => {
    it('should rebase branch', async () => {
      const dto: RebaseDto = {
        branch: 'main',
      };

      proxyService.rebase.mockResolvedValue(undefined);

      await controller.rebase('client-uuid', 'agent-uuid', dto);

      expect(proxyService.rebase).toHaveBeenCalledWith('client-uuid', 'agent-uuid', dto);
    });
  });

  describe('switchBranch', () => {
    it('should switch branch', async () => {
      proxyService.switchBranch.mockResolvedValue(undefined);

      await controller.switchBranch('client-uuid', 'agent-uuid', 'develop');

      expect(proxyService.switchBranch).toHaveBeenCalledWith('client-uuid', 'agent-uuid', 'develop');
    });
  });

  describe('createBranch', () => {
    it('should create branch', async () => {
      const dto: CreateBranchDto = {
        name: 'feature-branch',
        baseBranch: 'main',
      };

      proxyService.createBranch.mockResolvedValue(undefined);

      await controller.createBranch('client-uuid', 'agent-uuid', dto);

      expect(proxyService.createBranch).toHaveBeenCalledWith('client-uuid', 'agent-uuid', dto);
    });
  });

  describe('deleteBranch', () => {
    it('should delete branch', async () => {
      proxyService.deleteBranch.mockResolvedValue(undefined);

      await controller.deleteBranch('client-uuid', 'agent-uuid', 'feature-branch');

      expect(proxyService.deleteBranch).toHaveBeenCalledWith('client-uuid', 'agent-uuid', 'feature-branch');
    });
  });

  describe('resolveConflict', () => {
    it('should resolve conflict', async () => {
      const dto: ResolveConflictDto = {
        path: 'src/file.ts',
        strategy: 'yours',
      };

      proxyService.resolveConflict.mockResolvedValue(undefined);

      await controller.resolveConflict('client-uuid', 'agent-uuid', dto);

      expect(proxyService.resolveConflict).toHaveBeenCalledWith('client-uuid', 'agent-uuid', dto);
    });
  });
});
