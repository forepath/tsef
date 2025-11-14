import {
  clearDirectoryListing,
  clearFileContent,
  createFileOrDirectory,
  createFileOrDirectoryFailure,
  createFileOrDirectorySuccess,
  deleteFileOrDirectory,
  deleteFileOrDirectoryFailure,
  deleteFileOrDirectorySuccess,
  listDirectory,
  listDirectoryFailure,
  listDirectorySuccess,
  readFile,
  readFileFailure,
  readFileSuccess,
  writeFile,
  writeFileFailure,
  writeFileSuccess,
} from './files.actions';
import { filesReducer, initialFilesState, type FilesState } from './files.reducer';
import type { FileContentDto, FileNodeDto } from './files.types';

describe('filesReducer', () => {
  const clientId = 'client-1';
  const agentId = 'agent-1';
  const filePath = 'test-file.txt';
  const directoryPath = '.';

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

  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN' };
      const state = filesReducer(undefined, action as any);

      expect(state).toEqual(initialFilesState);
    });
  });

  describe('readFile', () => {
    it('should set reading to true and clear error', () => {
      const state: FilesState = {
        ...initialFilesState,
        errors: { [`${clientId}:${agentId}:${filePath}`]: 'Previous error' },
      };

      const newState = filesReducer(state, readFile({ clientId, agentId, filePath }));

      const key = `${clientId}:${agentId}:${filePath}`;
      expect(newState.reading[key]).toBe(true);
      expect(newState.errors[key]).toBeNull();
    });
  });

  describe('readFileSuccess', () => {
    it('should store file content and set reading to false', () => {
      const state: FilesState = {
        ...initialFilesState,
        reading: { [`${clientId}:${agentId}:${filePath}`]: true },
      };

      const newState = filesReducer(state, readFileSuccess({ clientId, agentId, filePath, content: mockFileContent }));

      const key = `${clientId}:${agentId}:${filePath}`;
      expect(newState.fileContents[key]).toEqual(mockFileContent);
      expect(newState.reading[key]).toBe(false);
      expect(newState.errors[key]).toBeNull();
    });
  });

  describe('readFileFailure', () => {
    it('should set error and set reading to false', () => {
      const state: FilesState = {
        ...initialFilesState,
        reading: { [`${clientId}:${agentId}:${filePath}`]: true },
      };

      const newState = filesReducer(state, readFileFailure({ clientId, agentId, filePath, error: 'Read failed' }));

      const key = `${clientId}:${agentId}:${filePath}`;
      expect(newState.errors[key]).toBe('Read failed');
      expect(newState.reading[key]).toBe(false);
    });
  });

  describe('writeFile', () => {
    it('should set writing to true and clear error', () => {
      const state: FilesState = {
        ...initialFilesState,
        errors: { [`${clientId}:${agentId}:${filePath}`]: 'Previous error' },
      };

      const newState = filesReducer(
        state,
        writeFile({ clientId, agentId, filePath, writeFileDto: { content: 'base64' } }),
      );

      const key = `${clientId}:${agentId}:${filePath}`;
      expect(newState.writing[key]).toBe(true);
      expect(newState.errors[key]).toBeNull();
    });
  });

  describe('writeFileSuccess', () => {
    it('should invalidate cached content and set writing to false', () => {
      const key = `${clientId}:${agentId}:${filePath}`;
      const state: FilesState = {
        ...initialFilesState,
        fileContents: { [key]: mockFileContent },
        writing: { [key]: true },
      };

      const newState = filesReducer(state, writeFileSuccess({ clientId, agentId, filePath }));

      expect(newState.fileContents[key]).toBeUndefined();
      expect(newState.writing[key]).toBe(false);
      expect(newState.errors[key]).toBeNull();
    });
  });

  describe('writeFileFailure', () => {
    it('should set error and set writing to false', () => {
      const key = `${clientId}:${agentId}:${filePath}`;
      const state: FilesState = {
        ...initialFilesState,
        writing: { [key]: true },
      };

      const newState = filesReducer(state, writeFileFailure({ clientId, agentId, filePath, error: 'Write failed' }));

      expect(newState.errors[key]).toBe('Write failed');
      expect(newState.writing[key]).toBe(false);
    });
  });

  describe('listDirectory', () => {
    it('should set listing to true and clear error', () => {
      const key = `${clientId}:${agentId}:${directoryPath}`;
      const state: FilesState = {
        ...initialFilesState,
        errors: { [key]: 'Previous error' },
      };

      const newState = filesReducer(state, listDirectory({ clientId, agentId }));

      expect(newState.listing[key]).toBe(true);
      expect(newState.errors[key]).toBeNull();
    });

    it('should use provided path parameter', () => {
      const customPath = 'subdirectory';
      const key = `${clientId}:${agentId}:${customPath}`;

      const newState = filesReducer(
        initialFilesState,
        listDirectory({ clientId, agentId, params: { path: customPath } }),
      );

      expect(newState.listing[key]).toBe(true);
    });
  });

  describe('listDirectorySuccess', () => {
    it('should store directory listing and set listing to false', () => {
      const key = `${clientId}:${agentId}:${directoryPath}`;
      const state: FilesState = {
        ...initialFilesState,
        listing: { [key]: true },
      };

      const newState = filesReducer(
        state,
        listDirectorySuccess({ clientId, agentId, directoryPath, files: mockFileNodes }),
      );

      expect(newState.directoryListings[key]).toEqual(mockFileNodes);
      expect(newState.listing[key]).toBe(false);
      expect(newState.errors[key]).toBeNull();
    });
  });

  describe('listDirectoryFailure', () => {
    it('should set error and set listing to false', () => {
      const key = `${clientId}:${agentId}:${directoryPath}`;
      const state: FilesState = {
        ...initialFilesState,
        listing: { [key]: true },
      };

      const newState = filesReducer(
        state,
        listDirectoryFailure({ clientId, agentId, directoryPath, error: 'List failed' }),
      );

      expect(newState.errors[key]).toBe('List failed');
      expect(newState.listing[key]).toBe(false);
    });
  });

  describe('createFileOrDirectory', () => {
    it('should set creating to true and clear error', () => {
      const key = `${clientId}:${agentId}:${filePath}`;
      const state: FilesState = {
        ...initialFilesState,
        errors: { [key]: 'Previous error' },
      };

      const newState = filesReducer(
        state,
        createFileOrDirectory({ clientId, agentId, filePath, createFileDto: { type: 'file' } }),
      );

      expect(newState.creating[key]).toBe(true);
      expect(newState.errors[key]).toBeNull();
    });
  });

  describe('createFileOrDirectorySuccess', () => {
    it('should invalidate parent directory listing and set creating to false', () => {
      const key = `${clientId}:${agentId}:${filePath}`;
      const parentPath = '.';
      const parentKey = `${clientId}:${agentId}:${parentPath}`;
      const state: FilesState = {
        ...initialFilesState,
        directoryListings: { [parentKey]: mockFileNodes },
        creating: { [key]: true },
      };

      const newState = filesReducer(
        state,
        createFileOrDirectorySuccess({ clientId, agentId, filePath, fileType: 'file' }),
      );

      expect(newState.directoryListings[parentKey]).toBeUndefined();
      expect(newState.creating[key]).toBe(false);
      expect(newState.errors[key]).toBeNull();
    });
  });

  describe('createFileOrDirectoryFailure', () => {
    it('should set error and set creating to false', () => {
      const key = `${clientId}:${agentId}:${filePath}`;
      const state: FilesState = {
        ...initialFilesState,
        creating: { [key]: true },
      };

      const newState = filesReducer(
        state,
        createFileOrDirectoryFailure({ clientId, agentId, filePath, error: 'Create failed' }),
      );

      expect(newState.errors[key]).toBe('Create failed');
      expect(newState.creating[key]).toBe(false);
    });
  });

  describe('deleteFileOrDirectory', () => {
    it('should set deleting to true and clear error', () => {
      const key = `${clientId}:${agentId}:${filePath}`;
      const state: FilesState = {
        ...initialFilesState,
        errors: { [key]: 'Previous error' },
      };

      const newState = filesReducer(state, deleteFileOrDirectory({ clientId, agentId, filePath }));

      expect(newState.deleting[key]).toBe(true);
      expect(newState.errors[key]).toBeNull();
    });
  });

  describe('deleteFileOrDirectorySuccess', () => {
    it('should remove from cache and invalidate parent directory listing', () => {
      const key = `${clientId}:${agentId}:${filePath}`;
      const parentPath = '.';
      const parentKey = `${clientId}:${agentId}:${parentPath}`;
      const state: FilesState = {
        ...initialFilesState,
        fileContents: { [key]: mockFileContent },
        directoryListings: { [key]: mockFileNodes, [parentKey]: mockFileNodes },
        deleting: { [key]: true },
      };

      const newState = filesReducer(state, deleteFileOrDirectorySuccess({ clientId, agentId, filePath }));

      expect(newState.fileContents[key]).toBeUndefined();
      expect(newState.directoryListings[key]).toBeUndefined();
      expect(newState.directoryListings[parentKey]).toBeUndefined();
      expect(newState.deleting[key]).toBe(false);
      expect(newState.errors[key]).toBeNull();
    });
  });

  describe('deleteFileOrDirectoryFailure', () => {
    it('should set error and set deleting to false', () => {
      const key = `${clientId}:${agentId}:${filePath}`;
      const state: FilesState = {
        ...initialFilesState,
        deleting: { [key]: true },
      };

      const newState = filesReducer(
        state,
        deleteFileOrDirectoryFailure({ clientId, agentId, filePath, error: 'Delete failed' }),
      );

      expect(newState.errors[key]).toBe('Delete failed');
      expect(newState.deleting[key]).toBe(false);
    });
  });

  describe('clearFileContent', () => {
    it('should remove file content from cache', () => {
      const key = `${clientId}:${agentId}:${filePath}`;
      const state: FilesState = {
        ...initialFilesState,
        fileContents: { [key]: mockFileContent },
      };

      const newState = filesReducer(state, clearFileContent({ clientId, agentId, filePath }));

      expect(newState.fileContents[key]).toBeUndefined();
    });
  });

  describe('clearDirectoryListing', () => {
    it('should remove directory listing from cache', () => {
      const key = `${clientId}:${agentId}:${directoryPath}`;
      const state: FilesState = {
        ...initialFilesState,
        directoryListings: { [key]: mockFileNodes },
      };

      const newState = filesReducer(state, clearDirectoryListing({ clientId, agentId, directoryPath }));

      expect(newState.directoryListings[key]).toBeUndefined();
    });
  });

  describe('multiple clients and agents', () => {
    it('should handle different client/agent/path combinations independently', () => {
      const clientId2 = 'client-2';
      const agentId2 = 'agent-2';
      const filePath2 = 'other-file.txt';
      const key1 = `${clientId}:${agentId}:${filePath}`;
      const key2 = `${clientId2}:${agentId2}:${filePath2}`;

      let state = initialFilesState;

      // Read file for first client/agent
      state = filesReducer(state, readFile({ clientId, agentId, filePath }));
      expect(state.reading[key1]).toBe(true);

      // Read file for second client/agent
      state = filesReducer(state, readFile({ clientId: clientId2, agentId: agentId2, filePath: filePath2 }));
      expect(state.reading[key2]).toBe(true);
      expect(state.reading[key1]).toBe(true); // First one still loading

      // Success for first
      state = filesReducer(state, readFileSuccess({ clientId, agentId, filePath, content: mockFileContent }));
      expect(state.reading[key1]).toBe(false);
      expect(state.fileContents[key1]).toEqual(mockFileContent);
      expect(state.reading[key2]).toBe(true); // Second one still loading
    });
  });
});
