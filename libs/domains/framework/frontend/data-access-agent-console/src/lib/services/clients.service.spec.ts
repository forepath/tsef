import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import type {
  ClientResponseDto,
  CreateClientDto,
  CreateClientResponseDto,
  UpdateClientDto,
} from '../state/clients/clients.types';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3100/api';

  const mockClient: ClientResponseDto = {
    id: 'client-1',
    name: 'Test Client',
    description: 'Test Description',
    endpoint: 'https://example.com/api',
    authenticationType: 'api_key',
    isAutoProvisioned: false,
    config: {
      gitRepositoryUrl: 'https://github.com/user/repo.git',
      agentTypes: [{ type: 'cursor', displayName: 'Cursor' }],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockCreateClientResponse: CreateClientResponseDto = {
    ...mockClient,
    apiKey: 'generated-api-key',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ENVIRONMENT,
          useValue: {
            controller: {
              restApiUrl: apiUrl,
            },
          },
        },
      ],
    });

    service = TestBed.inject(ClientsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listClients', () => {
    it('should return clients array', (done) => {
      const mockClients: ClientResponseDto[] = [mockClient];

      service.listClients().subscribe((clients) => {
        expect(clients).toEqual(mockClients);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients`);
      expect(req.request.method).toBe('GET');
      req.flush(mockClients);
    });

    it('should include pagination parameters when provided', (done) => {
      const params = { limit: 10, offset: 20 };
      const mockClients: ClientResponseDto[] = [mockClient];

      service.listClients(params).subscribe((clients) => {
        expect(clients).toEqual(mockClients);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients?limit=10&offset=20`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('offset')).toBe('20');
      req.flush(mockClients);
    });
  });

  describe('getClient', () => {
    it('should return a client by id', (done) => {
      const clientId = 'client-1';

      service.getClient(clientId).subscribe((client) => {
        expect(client).toEqual(mockClient);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockClient);
    });
  });

  describe('createClient', () => {
    it('should create a new client', (done) => {
      const createDto: CreateClientDto = {
        name: 'New Client',
        endpoint: 'https://example.com/api',
        authenticationType: 'api_key',
      };

      service.createClient(createDto).subscribe((client) => {
        expect(client).toEqual(mockCreateClientResponse);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(mockCreateClientResponse);
    });
  });

  describe('updateClient', () => {
    it('should update an existing client', (done) => {
      const clientId = 'client-1';
      const updateDto: UpdateClientDto = {
        name: 'Updated Client',
      };

      service.updateClient(clientId, updateDto).subscribe((client) => {
        expect(client).toEqual({ ...mockClient, name: 'Updated Client' });
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(updateDto);
      req.flush({ ...mockClient, name: 'Updated Client' });
    });
  });

  describe('deleteClient', () => {
    it('should delete a client', (done) => {
      const clientId = 'client-1';

      service.deleteClient(clientId).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('apiUrl fallback', () => {
    it('should use default API URL when environment controller is not configured', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          {
            provide: ENVIRONMENT,
            useValue: {
              controller: undefined,
            },
          },
        ],
      });

      const serviceWithFallback = TestBed.inject(ClientsService);
      const httpMockWithFallback = TestBed.inject(HttpTestingController);

      serviceWithFallback.listClients().subscribe();

      const req = httpMockWithFallback.expectOne('http://localhost:3100/api/clients');
      expect(req.request.method).toBe('GET');
      req.flush([]);
      httpMockWithFallback.verify();
    });
  });
});
