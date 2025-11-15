import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { FileContentDto, FileNodeDto } from './files.types';
import type { FilesState, OpenTab } from './files.reducer';

export const selectFilesState = createFeatureSelector<FilesState>('files');

// Base selectors
export const selectFileContents = createSelector(selectFilesState, (state) => state.fileContents);
export const selectDirectoryListings = createSelector(selectFilesState, (state) => state.directoryListings);
export const selectFilesReading = createSelector(selectFilesState, (state) => state.reading);
export const selectFilesWriting = createSelector(selectFilesState, (state) => state.writing);
export const selectFilesListing = createSelector(selectFilesState, (state) => state.listing);
export const selectFilesCreating = createSelector(selectFilesState, (state) => state.creating);
export const selectFilesDeleting = createSelector(selectFilesState, (state) => state.deleting);
export const selectFilesMoving = createSelector(selectFilesState, (state) => state.moving);
export const selectFilesErrors = createSelector(selectFilesState, (state) => state.errors);

/**
 * Generate a key for file operations (clientId:agentId:path)
 */
function getFileKey(clientId: string, agentId: string, path: string): string {
  return `${clientId}:${agentId}:${path}`;
}

// File content selectors (factory functions)
export const selectFileContent = (clientId: string, agentId: string, filePath: string) =>
  createSelector(selectFileContents, (fileContents) => {
    const key = getFileKey(clientId, agentId, filePath);
    return fileContents[key] ?? null;
  });

export const selectIsReadingFile = (clientId: string, agentId: string, filePath: string) =>
  createSelector(selectFilesReading, (reading) => {
    const key = getFileKey(clientId, agentId, filePath);
    return reading[key] ?? false;
  });

export const selectIsWritingFile = (clientId: string, agentId: string, filePath: string) =>
  createSelector(selectFilesWriting, (writing) => {
    const key = getFileKey(clientId, agentId, filePath);
    return writing[key] ?? false;
  });

// Directory listing selectors (factory functions)
export const selectDirectoryListing = (clientId: string, agentId: string, directoryPath: string) =>
  createSelector(selectDirectoryListings, (directoryListings) => {
    const key = getFileKey(clientId, agentId, directoryPath);
    return directoryListings[key] ?? null;
  });

export const selectIsListingDirectory = (clientId: string, agentId: string, directoryPath: string) =>
  createSelector(selectFilesListing, (listing) => {
    const key = getFileKey(clientId, agentId, directoryPath);
    return listing[key] ?? false;
  });

// Create/Delete selectors (factory functions)
export const selectIsCreatingFile = (clientId: string, agentId: string, filePath: string) =>
  createSelector(selectFilesCreating, (creating) => {
    const key = getFileKey(clientId, agentId, filePath);
    return creating[key] ?? false;
  });

export const selectIsDeletingFile = (clientId: string, agentId: string, filePath: string) =>
  createSelector(selectFilesDeleting, (deleting) => {
    const key = getFileKey(clientId, agentId, filePath);
    return deleting[key] ?? false;
  });

export const selectIsMovingFile = (clientId: string, agentId: string, filePath: string) =>
  createSelector(selectFilesMoving, (moving) => {
    const key = getFileKey(clientId, agentId, filePath);
    return moving[key] ?? false;
  });

// Error selectors (factory functions)
export const selectFileError = (clientId: string, agentId: string, filePath: string) =>
  createSelector(selectFilesErrors, (errors) => {
    const key = getFileKey(clientId, agentId, filePath);
    return errors[key] ?? null;
  });

// Combined loading selector for a specific file operation
export const selectFileOperationLoading = (clientId: string, agentId: string, filePath: string) =>
  createSelector(
    selectIsReadingFile(clientId, agentId, filePath),
    selectIsWritingFile(clientId, agentId, filePath),
    selectIsCreatingFile(clientId, agentId, filePath),
    selectIsDeletingFile(clientId, agentId, filePath),
    selectIsMovingFile(clientId, agentId, filePath),
    (reading, writing, creating, deleting, moving) => reading || writing || creating || deleting || moving,
  );

// Combined loading selector for a specific directory operation
export const selectDirectoryOperationLoading = (clientId: string, agentId: string, directoryPath: string) =>
  createSelector(selectIsListingDirectory(clientId, agentId, directoryPath), (listing) => listing);

// Open tabs selectors
export const selectOpenTabs = createSelector(selectFilesState, (state) => state.openTabs);

/**
 * Get open tabs for a specific client and agent.
 * @param clientId - The client ID
 * @param agentId - The agent ID
 * @returns Selector that returns array of open tabs
 */
export const selectOpenTabsForClientAgent = (clientId: string, agentId: string) =>
  createSelector(selectOpenTabs, (openTabs) => {
    const key = `${clientId}:${agentId}`;
    return openTabs[key] || [];
  });
