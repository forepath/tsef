import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import type { CreateFileDto, FileContentDto, FileNodeDto, MoveFileDto, WriteFileDto } from '../state/files/files.types';
import { FilesService } from './files.service';

describe('FilesService', () => {
  let service: FilesService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3100/api';
  const clientId = 'client-1';
  const agentId = 'agent-1';

  const mockFileContent: FileContentDto = {
    content: Buffer.from('Hello, World!', 'utf-8').toString('base64'),
    encoding: 'utf-8',
  };

  const mockFileNodes: FileNodeDto[] = [
    {
      name: 'file1.txt',
      type: 'file',
      path: 'file1.txt',
      size: 1024,
      modifiedAt: '2024-01-01T00:00:00Z',
    },
    {
      name: 'dir1',
      type: 'directory',
      path: 'dir1',
    },
  ];

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

    service = TestBed.inject(FilesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('readFile', () => {
    it('should return file content', (done) => {
      const filePath = 'test-file.txt';

      service.readFile(clientId, agentId, filePath).subscribe((content) => {
        expect(content).toEqual(mockFileContent);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files/${filePath}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockFileContent);
    });

    it('should encode file path segments separately preserving forward slashes', (done) => {
      const filePath = 'folder/sub folder/file with spaces.txt';
      const expectedPath = 'folder/sub%20folder/file%20with%20spaces.txt';

      service.readFile(clientId, agentId, filePath).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files/${expectedPath}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockFileContent);
    });
  });

  describe('writeFile', () => {
    it('should write file content', (done) => {
      const filePath = 'test-file.txt';
      const writeDto: WriteFileDto = {
        content: Buffer.from('New content', 'utf-8').toString('base64'),
        encoding: 'utf-8',
      };

      service.writeFile(clientId, agentId, filePath, writeDto).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files/${filePath}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(writeDto);
      req.flush(null);
    });
  });

  describe('listDirectory', () => {
    it('should return directory listing', (done) => {
      service.listDirectory(clientId, agentId).subscribe((files) => {
        expect(files).toEqual(mockFileNodes);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files`);
      expect(req.request.method).toBe('GET');
      req.flush(mockFileNodes);
    });

    it('should include path parameter when provided', (done) => {
      const params = { path: 'subdirectory' };

      service.listDirectory(clientId, agentId, params).subscribe((files) => {
        expect(files).toEqual(mockFileNodes);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files?path=subdirectory`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('path')).toBe('subdirectory');
      req.flush(mockFileNodes);
    });
  });

  describe('createFileOrDirectory', () => {
    it('should create a file with content', (done) => {
      const filePath = 'new-file.txt';
      const createDto: CreateFileDto = {
        type: 'file',
        content: Buffer.from('File content', 'utf-8').toString('base64'),
      };

      service.createFileOrDirectory(clientId, agentId, filePath, createDto).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files/${filePath}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(null);
    });

    it('should create a directory', (done) => {
      const directoryPath = 'new-directory';
      const createDto: CreateFileDto = {
        type: 'directory',
      };

      service.createFileOrDirectory(clientId, agentId, directoryPath, createDto).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files/${directoryPath}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(null);
    });
  });

  describe('deleteFileOrDirectory', () => {
    it('should delete a file', (done) => {
      const filePath = 'file-to-delete.txt';

      service.deleteFileOrDirectory(clientId, agentId, filePath).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files/${filePath}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('moveFileOrDirectory', () => {
    it('should move a file', (done) => {
      const sourcePath = 'source-file.txt';
      const moveDto: MoveFileDto = {
        destination: 'dest-file.txt',
      };

      service.moveFileOrDirectory(clientId, agentId, sourcePath, moveDto).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files/${sourcePath}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(moveDto);
      req.flush(null);
    });

    it('should encode source path segments separately preserving forward slashes', (done) => {
      const sourcePath = 'tools/pAGENTZx.md';
      const moveDto: MoveFileDto = {
        destination: 'dest-file.txt',
      };

      service.moveFileOrDirectory(clientId, agentId, sourcePath, moveDto).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files/${sourcePath}`);
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });

    it('should encode source path with special characters in segments', (done) => {
      const sourcePath = 'folder/sub folder/file with spaces.txt';
      const expectedPath = 'folder/sub%20folder/file%20with%20spaces.txt';
      const moveDto: MoveFileDto = {
        destination: 'dest-file.txt',
      };

      service.moveFileOrDirectory(clientId, agentId, sourcePath, moveDto).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/clients/${clientId}/agents/${agentId}/files/${expectedPath}`);
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });
  });
});
