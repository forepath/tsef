import { createAction, props } from '@ngrx/store';
import type { CreateFileDto, FileContentDto, FileNodeDto, ListDirectoryParams, WriteFileDto } from './files.types';

// Read File Actions
export const readFile = createAction(
  '[Files] Read File',
  props<{ clientId: string; agentId: string; filePath: string }>(),
);

export const readFileSuccess = createAction(
  '[Files] Read File Success',
  props<{ clientId: string; agentId: string; filePath: string; content: FileContentDto }>(),
);

export const readFileFailure = createAction(
  '[Files] Read File Failure',
  props<{ clientId: string; agentId: string; filePath: string; error: string }>(),
);

// Write File Actions
export const writeFile = createAction(
  '[Files] Write File',
  props<{ clientId: string; agentId: string; filePath: string; writeFileDto: WriteFileDto }>(),
);

export const writeFileSuccess = createAction(
  '[Files] Write File Success',
  props<{ clientId: string; agentId: string; filePath: string }>(),
);

export const writeFileFailure = createAction(
  '[Files] Write File Failure',
  props<{ clientId: string; agentId: string; filePath: string; error: string }>(),
);

// List Directory Actions
export const listDirectory = createAction(
  '[Files] List Directory',
  props<{ clientId: string; agentId: string; params?: ListDirectoryParams }>(),
);

export const listDirectorySuccess = createAction(
  '[Files] List Directory Success',
  props<{ clientId: string; agentId: string; directoryPath: string; files: FileNodeDto[] }>(),
);

export const listDirectoryFailure = createAction(
  '[Files] List Directory Failure',
  props<{ clientId: string; agentId: string; directoryPath: string; error: string }>(),
);

// Create File/Directory Actions
export const createFileOrDirectory = createAction(
  '[Files] Create File Or Directory',
  props<{ clientId: string; agentId: string; filePath: string; createFileDto: CreateFileDto }>(),
);

export const createFileOrDirectorySuccess = createAction(
  '[Files] Create File Or Directory Success',
  props<{ clientId: string; agentId: string; filePath: string; fileType: 'file' | 'directory' }>(),
);

export const createFileOrDirectoryFailure = createAction(
  '[Files] Create File Or Directory Failure',
  props<{ clientId: string; agentId: string; filePath: string; error: string }>(),
);

// Delete File/Directory Actions
export const deleteFileOrDirectory = createAction(
  '[Files] Delete File Or Directory',
  props<{ clientId: string; agentId: string; filePath: string }>(),
);

export const deleteFileOrDirectorySuccess = createAction(
  '[Files] Delete File Or Directory Success',
  props<{ clientId: string; agentId: string; filePath: string }>(),
);

export const deleteFileOrDirectoryFailure = createAction(
  '[Files] Delete File Or Directory Failure',
  props<{ clientId: string; agentId: string; filePath: string; error: string }>(),
);

// Clear file content from cache
export const clearFileContent = createAction(
  '[Files] Clear File Content',
  props<{ clientId: string; agentId: string; filePath: string }>(),
);

// Clear directory listing from cache
export const clearDirectoryListing = createAction(
  '[Files] Clear Directory Listing',
  props<{ clientId: string; agentId: string; directoryPath: string }>(),
);
