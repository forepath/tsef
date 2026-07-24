import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '@forepath/shared/frontend/util-configuration';

import type { AddonResponse, CreateAddonDto, UpdateAddonDto } from '../types/billing.types';

import { AddonsService } from './addons.service';

describe('AddonsService', () => {
  let service: AddonsService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3200/api';
  const mockAddon: AddonResponse = {
    id: 'addon-1',
    key: 'backup',
    name: 'Backup',
    implementationType: 'module',
    moduleKey: 'backup',
    configSchema: {},
    compatibleProviders: ['hetzner'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ENVIRONMENT,
          useValue: { billing: { restApiUrl: apiUrl } },
        },
      ],
    });

    service = TestBed.inject(AddonsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listAddons', () => {
    it('lists addons', (done) => {
      service.listAddons().subscribe((list) => {
        expect(list).toEqual([mockAddon]);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/addons`);
      expect(req.request.method).toBe('GET');
      req.flush([mockAddon]);
    });

    it('includes pagination parameters when provided', (done) => {
      service.listAddons({ limit: 10, offset: 20 }).subscribe((list) => {
        expect(list).toEqual([mockAddon]);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/addons?limit=10&offset=20`);
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('offset')).toBe('20');
      req.flush([mockAddon]);
    });
  });

  describe('getAddon', () => {
    it('returns an addon by id', (done) => {
      service.getAddon('addon-1').subscribe((addon) => {
        expect(addon).toEqual(mockAddon);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/addons/addon-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAddon);
    });
  });

  describe('createAddon', () => {
    it('creates an addon', (done) => {
      const dto: CreateAddonDto = {
        key: 'backup',
        name: 'Backup',
        implementationType: 'module',
        moduleKey: 'backup',
      };

      service.createAddon(dto).subscribe((addon) => {
        expect(addon).toEqual(mockAddon);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/addons`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockAddon);
    });
  });

  describe('updateAddon', () => {
    it('updates an addon', (done) => {
      const dto: UpdateAddonDto = { name: 'Updated' };

      service.updateAddon('addon-1', dto).subscribe((addon) => {
        expect(addon).toEqual(mockAddon);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/addons/addon-1`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockAddon);
    });
  });

  describe('deleteAddon', () => {
    it('deletes an addon', (done) => {
      service.deleteAddon('addon-1').subscribe((result) => {
        expect(result).toBeNull();
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/addons/addon-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
