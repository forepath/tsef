import { createReducer, on } from '@ngrx/store';
import type { FileContentDto, FileNodeDto } from './files.types';
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

export interface FilesState {
  // File contents keyed by clientId:agentId:filePath
  fileContents: Record<string, FileContentDto>;
  // Directory listings keyed by clientId:agentId:directoryPath
  directoryListings: Record<string, FileNodeDto[]>;
  // Loading states keyed by clientId:agentId:filePath or clientId:agentId:directoryPath
  reading: Record<string, boolean>;
  writing: Record<string, boolean>;
  listing: Record<string, boolean>;
  creating: Record<string, boolean>;
  deleting: Record<string, boolean>;
  // Errors keyed by clientId:agentId:filePath or clientId:agentId:directoryPath
  errors: Record<string, string | null>;
}

export const initialFilesState: FilesState = {
  fileContents: {},
  directoryListings: {},
  reading: {},
  writing: {},
  listing: {},
  creating: {},
  deleting: {},
  errors: {},
};

/**
 * Generate a key for file operations (clientId:agentId:path)
 */
function getFileKey(clientId: string, agentId: string, path: string): string {
  return `${clientId}:${agentId}:${path}`;
}

export const filesReducer = createReducer(
  initialFilesState,
  // Read File
  on(readFile, (state, { clientId, agentId, filePath }) => {
    const key = getFileKey(clientId, agentId, filePath);
    return {
      ...state,
      reading: { ...state.reading, [key]: true },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(readFileSuccess, (state, { clientId, agentId, filePath, content }) => {
    const key = getFileKey(clientId, agentId, filePath);
    return {
      ...state,
      fileContents: { ...state.fileContents, [key]: content },
      reading: { ...state.reading, [key]: false },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(readFileFailure, (state, { clientId, agentId, filePath, error }) => {
    const key = getFileKey(clientId, agentId, filePath);
    return {
      ...state,
      reading: { ...state.reading, [key]: false },
      errors: { ...state.errors, [key]: error },
    };
  }),
  // Write File
  on(writeFile, (state, { clientId, agentId, filePath }) => {
    const key = getFileKey(clientId, agentId, filePath);
    return {
      ...state,
      writing: { ...state.writing, [key]: true },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(writeFileSuccess, (state, { clientId, agentId, filePath }) => {
    const key = getFileKey(clientId, agentId, filePath);
    // Invalidate cached content after write
    const { [key]: removed, ...fileContents } = state.fileContents;
    return {
      ...state,
      fileContents,
      writing: { ...state.writing, [key]: false },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(writeFileFailure, (state, { clientId, agentId, filePath, error }) => {
    const key = getFileKey(clientId, agentId, filePath);
    return {
      ...state,
      writing: { ...state.writing, [key]: false },
      errors: { ...state.errors, [key]: error },
    };
  }),
  // List Directory
  on(listDirectory, (state, { clientId, agentId, params }) => {
    const directoryPath = params?.path || '.';
    const key = getFileKey(clientId, agentId, directoryPath);
    return {
      ...state,
      listing: { ...state.listing, [key]: true },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(listDirectorySuccess, (state, { clientId, agentId, directoryPath, files }) => {
    const key = getFileKey(clientId, agentId, directoryPath);
    return {
      ...state,
      directoryListings: { ...state.directoryListings, [key]: files },
      listing: { ...state.listing, [key]: false },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(listDirectoryFailure, (state, { clientId, agentId, directoryPath, error }) => {
    const key = getFileKey(clientId, agentId, directoryPath);
    return {
      ...state,
      listing: { ...state.listing, [key]: false },
      errors: { ...state.errors, [key]: error },
    };
  }),
  // Create File/Directory
  on(createFileOrDirectory, (state, { clientId, agentId, filePath }) => {
    const key = getFileKey(clientId, agentId, filePath);
    return {
      ...state,
      creating: { ...state.creating, [key]: true },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(createFileOrDirectorySuccess, (state, { clientId, agentId, filePath, fileType }) => {
    const key = getFileKey(clientId, agentId, filePath);
    // Invalidate parent directory listing
    const parentPath = filePath.split('/').slice(0, -1).join('/') || '.';
    const parentKey = getFileKey(clientId, agentId, parentPath);
    const { [parentKey]: removed, ...directoryListings } = state.directoryListings;
    return {
      ...state,
      directoryListings,
      creating: { ...state.creating, [key]: false },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(createFileOrDirectoryFailure, (state, { clientId, agentId, filePath, error }) => {
    const key = getFileKey(clientId, agentId, filePath);
    return {
      ...state,
      creating: { ...state.creating, [key]: false },
      errors: { ...state.errors, [key]: error },
    };
  }),
  // Delete File/Directory
  on(deleteFileOrDirectory, (state, { clientId, agentId, filePath }) => {
    const key = getFileKey(clientId, agentId, filePath);
    return {
      ...state,
      deleting: { ...state.deleting, [key]: true },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(deleteFileOrDirectorySuccess, (state, { clientId, agentId, filePath }) => {
    const key = getFileKey(clientId, agentId, filePath);
    // Remove from cache
    const { [key]: removedContent, ...fileContents } = state.fileContents;
    const { [key]: removedListing, ...directoryListings } = state.directoryListings;
    // Invalidate parent directory listing
    const parentPath = filePath.split('/').slice(0, -1).join('/') || '.';
    const parentKey = getFileKey(clientId, agentId, parentPath);
    const { [parentKey]: removedParent, ...remainingListings } = directoryListings;
    return {
      ...state,
      fileContents,
      directoryListings: remainingListings,
      deleting: { ...state.deleting, [key]: false },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(deleteFileOrDirectoryFailure, (state, { clientId, agentId, filePath, error }) => {
    const key = getFileKey(clientId, agentId, filePath);
    return {
      ...state,
      deleting: { ...state.deleting, [key]: false },
      errors: { ...state.errors, [key]: error },
    };
  }),
  // Clear File Content
  on(clearFileContent, (state, { clientId, agentId, filePath }) => {
    const key = getFileKey(clientId, agentId, filePath);
    const { [key]: removed, ...fileContents } = state.fileContents;
    return {
      ...state,
      fileContents,
    };
  }),
  // Clear Directory Listing
  on(clearDirectoryListing, (state, { clientId, agentId, directoryPath }) => {
    const key = getFileKey(clientId, agentId, directoryPath);
    const { [key]: removed, ...directoryListings } = state.directoryListings;
    return {
      ...state,
      directoryListings,
    };
  }),
);
