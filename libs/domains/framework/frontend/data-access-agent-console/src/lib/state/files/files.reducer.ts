import { createReducer, on } from '@ngrx/store';
import {
  clearDirectoryListing,
  clearFileContent,
  clearOpenTabs,
  closeFileTab,
  createFileOrDirectory,
  createFileOrDirectoryFailure,
  createFileOrDirectorySuccess,
  deleteFileOrDirectory,
  deleteFileOrDirectoryFailure,
  deleteFileOrDirectorySuccess,
  listDirectory,
  listDirectoryFailure,
  listDirectorySuccess,
  moveTabToFront,
  openFileTab,
  pinFileTab,
  readFile,
  readFileFailure,
  readFileSuccess,
  unpinFileTab,
  writeFile,
  writeFileFailure,
  writeFileSuccess,
} from './files.actions';
import type { FileContentDto, FileNodeDto } from './files.types';

export interface OpenTab {
  filePath: string;
  pinned: boolean;
}

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
  // Open tabs keyed by clientId:agentId
  openTabs: Record<string, OpenTab[]>;
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
  openTabs: {},
};

/**
 * Generate a key for file operations (clientId:agentId:path)
 */
function getFileKey(clientId: string, agentId: string, path: string): string {
  return `${clientId}:${agentId}:${path}`;
}

/**
 * Generate a key for client/agent operations (clientId:agentId)
 */
function getClientAgentKey(clientId: string, agentId: string): string {
  return `${clientId}:${agentId}`;
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
    const clientAgentKey = getClientAgentKey(clientId, agentId);
    // Invalidate cached content after write
    const { [key]: removed, ...fileContents } = state.fileContents;
    // Pin the tab when file is saved (create tab if it doesn't exist)
    const currentTabs = state.openTabs[clientAgentKey] || [];
    const existingTabIndex = currentTabs.findIndex((tab) => tab.filePath === filePath);
    let updatedTabs: OpenTab[];
    if (existingTabIndex >= 0) {
      // Update existing tab to pinned
      updatedTabs = currentTabs.map((tab) => (tab.filePath === filePath ? { ...tab, pinned: true } : tab));
    } else {
      // Create new pinned tab
      updatedTabs = [...currentTabs, { filePath, pinned: true }];
    }
    return {
      ...state,
      fileContents,
      writing: { ...state.writing, [key]: false },
      errors: { ...state.errors, [key]: null },
      openTabs: {
        ...state.openTabs,
        [clientAgentKey]: updatedTabs,
      },
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
  // Open File Tab
  on(openFileTab, (state, { clientId, agentId, filePath }) => {
    const key = getClientAgentKey(clientId, agentId);
    const currentTabs = state.openTabs[key] || [];
    // Keep only pinned tabs, remove all unpinned tabs
    const pinnedTabs = currentTabs.filter((tab) => tab.pinned);
    // Check if the tab being opened already exists (and is pinned)
    const existingTab = pinnedTabs.find((tab) => tab.filePath === filePath);
    if (existingTab) {
      // Tab already exists and is pinned, no change needed
      return state;
    }
    // Add new tab (unpinned by default) - unpinned tabs will be removed when another file is opened
    return {
      ...state,
      openTabs: {
        ...state.openTabs,
        [key]: [...pinnedTabs, { filePath, pinned: false }],
      },
    };
  }),
  // Close File Tab
  on(closeFileTab, (state, { clientId, agentId, filePath }) => {
    const key = getClientAgentKey(clientId, agentId);
    const currentTabs = state.openTabs[key] || [];
    const updatedTabs = currentTabs.filter((tab) => tab.filePath !== filePath);
    return {
      ...state,
      openTabs: {
        ...state.openTabs,
        [key]: updatedTabs,
      },
    };
  }),
  // Pin File Tab
  on(pinFileTab, (state, { clientId, agentId, filePath }) => {
    const key = getClientAgentKey(clientId, agentId);
    const currentTabs = state.openTabs[key] || [];
    const updatedTabs = currentTabs.map((tab) => (tab.filePath === filePath ? { ...tab, pinned: true } : tab));
    return {
      ...state,
      openTabs: {
        ...state.openTabs,
        [key]: updatedTabs,
      },
    };
  }),
  // Unpin File Tab
  on(unpinFileTab, (state, { clientId, agentId, filePath }) => {
    const key = getClientAgentKey(clientId, agentId);
    const currentTabs = state.openTabs[key] || [];
    const updatedTabs = currentTabs.map((tab) => (tab.filePath === filePath ? { ...tab, pinned: false } : tab));
    return {
      ...state,
      openTabs: {
        ...state.openTabs,
        [key]: updatedTabs,
      },
    };
  }),
  // Move Tab To Front
  on(moveTabToFront, (state, { clientId, agentId, filePath }) => {
    const key = getClientAgentKey(clientId, agentId);
    const currentTabs = state.openTabs[key] || [];
    const tabIndex = currentTabs.findIndex((tab) => tab.filePath === filePath);
    if (tabIndex === -1 || tabIndex === 0) {
      // Tab not found or already at front
      return state;
    }
    const tab = currentTabs[tabIndex];
    const updatedTabs = [tab, ...currentTabs.filter((_, index) => index !== tabIndex)];
    return {
      ...state,
      openTabs: {
        ...state.openTabs,
        [key]: updatedTabs,
      },
    };
  }),
  // Clear Open Tabs
  on(clearOpenTabs, (state, { clientId, agentId }) => {
    const key = getClientAgentKey(clientId, agentId);
    const { [key]: removed, ...openTabs } = state.openTabs;
    return {
      ...state,
      openTabs,
    };
  }),
);
