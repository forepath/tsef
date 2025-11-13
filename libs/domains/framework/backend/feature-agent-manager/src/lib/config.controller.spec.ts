import { Test, TestingModule } from '@nestjs/testing';
import { ConfigController } from './config.controller';
import { ConfigService } from './services/config.service';

describe('ConfigController', () => {
  let controller: ConfigController;
  let service: jest.Mocked<ConfigService>;

  const mockConfigService = {
    getGitRepositoryUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<ConfigController>(ConfigController);
    service = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return configuration with git repository URL when set', async () => {
      const gitRepositoryUrl = 'https://github.com/user/repo.git';
      service.getGitRepositoryUrl.mockReturnValue(gitRepositoryUrl);

      const result = await controller.getConfig();

      expect(result).toEqual({
        gitRepositoryUrl,
      });
      expect(service.getGitRepositoryUrl).toHaveBeenCalled();
    });

    it('should return configuration with undefined git repository URL when not set', async () => {
      service.getGitRepositoryUrl.mockReturnValue(undefined);

      const result = await controller.getConfig();

      expect(result).toEqual({
        gitRepositoryUrl: undefined,
      });
      expect(service.getGitRepositoryUrl).toHaveBeenCalled();
    });
  });
});
