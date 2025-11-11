import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { KeycloakTokenService } from './keycloak-token.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KeycloakTokenService', () => {
  let service: KeycloakTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeycloakTokenService],
    }).compile();

    service = module.get<KeycloakTokenService>(KeycloakTokenService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearAllCache();
  });

  describe('getAccessToken', () => {
    const authServerUrl = 'https://keycloak.example.com';
    const realm = 'test-realm';
    const clientId = 'test-client-id';
    const clientSecret = 'test-client-secret';

    it('should fetch and return access token from Keycloak', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'jwt-access-token-123',
          expires_in: 300,
          token_type: 'Bearer',
        },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);

      const result = await service.getAccessToken(authServerUrl, realm, clientId, clientSecret);

      expect(result).toBe('jwt-access-token-123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${authServerUrl}/realms/${realm}/protocol/openid-connect/token`,
        expect.stringContaining('grant_type=client_credentials'),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
    });

    it('should cache token and return cached token on subsequent calls', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'jwt-access-token-123',
          expires_in: 300,
          token_type: 'Bearer',
        },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);

      // First call should fetch from Keycloak
      const result1 = await service.getAccessToken(authServerUrl, realm, clientId, clientSecret);
      expect(result1).toBe('jwt-access-token-123');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Second call should use cached token
      const result2 = await service.getAccessToken(authServerUrl, realm, clientId, clientSecret);
      expect(result2).toBe('jwt-access-token-123');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should throw error when Keycloak returns no access token', async () => {
      const mockTokenResponse = {
        data: {
          expires_in: 300,
          token_type: 'Bearer',
        },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);

      await expect(service.getAccessToken(authServerUrl, realm, clientId, clientSecret)).rejects.toThrow(
        'Keycloak did not return an access token',
      );
    });

    it('should throw error when Keycloak request fails', async () => {
      const error = {
        message: 'Network Error',
        response: {
          data: {
            error: 'invalid_client',
            error_description: 'Invalid client credentials',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(error);

      await expect(service.getAccessToken(authServerUrl, realm, clientId, clientSecret)).rejects.toThrow(
        'Failed to authenticate with Keycloak',
      );
    });

    it('should handle error without response data', async () => {
      const error = {
        message: 'Network Error',
      };

      mockedAxios.post.mockRejectedValue(error);

      await expect(service.getAccessToken(authServerUrl, realm, clientId, clientSecret)).rejects.toThrow(
        'Failed to authenticate with Keycloak: Network Error',
      );
    });
  });

  describe('clearCache', () => {
    const authServerUrl = 'https://keycloak.example.com';
    const realm = 'test-realm';
    const clientId = 'test-client-id';
    const clientSecret = 'test-client-secret';

    it('should clear cached token for specific client', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'jwt-access-token-123',
          expires_in: 300,
          token_type: 'Bearer',
        },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);

      // Fetch and cache token
      await service.getAccessToken(authServerUrl, realm, clientId, clientSecret);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCache(authServerUrl, realm, clientId);

      // Next call should fetch again
      await service.getAccessToken(authServerUrl, realm, clientId, clientSecret);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearAllCache', () => {
    const authServerUrl = 'https://keycloak.example.com';
    const realm = 'test-realm';
    const clientId = 'test-client-id';
    const clientSecret = 'test-client-secret';

    it('should clear all cached tokens', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'jwt-access-token-123',
          expires_in: 300,
          token_type: 'Bearer',
        },
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);

      // Fetch and cache token
      await service.getAccessToken(authServerUrl, realm, clientId, clientSecret);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Clear all cache
      service.clearAllCache();

      // Next call should fetch again
      await service.getAccessToken(authServerUrl, realm, clientId, clientSecret);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });
});
