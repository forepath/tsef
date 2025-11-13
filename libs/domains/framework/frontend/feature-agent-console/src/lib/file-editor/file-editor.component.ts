import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  FilesFacade,
  type CreateFileDto,
  type FileContentDto,
  type WriteFileDto,
} from '@forepath/framework/frontend/data-access-agent-console';
import { combineLatest, filter, map, Observable, of, switchMap, take } from 'rxjs';
import { FileTreeComponent } from './file-tree/file-tree.component';
import { MonacoEditorWrapperComponent } from './monaco-editor-wrapper/monaco-editor-wrapper.component';

@Component({
  selector: 'framework-file-editor',
  imports: [CommonModule, FileTreeComponent, MonacoEditorWrapperComponent],
  templateUrl: './file-editor.component.html',
  styleUrls: ['./file-editor.component.scss'],
  standalone: true,
})
export class FileEditorComponent {
  private readonly filesFacade = inject(FilesFacade);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  clientId = input.required<string>();
  agentId = input.required<string>();

  // Internal state
  selectedFilePath = signal<string | null>(null);
  expandedPaths = signal<Set<string>>(new Set());
  dirtyFiles = signal<Set<string>>(new Set());
  editorContent = signal<string>('');
  lastLoadedFilePath = signal<string | null>(null);

  // Convert signals to observables
  private readonly selectedFilePath$ = toObservable(this.selectedFilePath);
  private readonly clientId$ = toObservable(this.clientId);
  private readonly agentId$ = toObservable(this.agentId);

  // Computed observables
  readonly selectedFileContent$: Observable<FileContentDto | null> = combineLatest([
    this.selectedFilePath$,
    this.clientId$,
    this.agentId$,
  ]).pipe(
    switchMap(([filePath, clientId, agentId]) => {
      if (!filePath || !clientId || !agentId) {
        return of(null);
      }
      return this.filesFacade.getFileContent$(clientId, agentId, filePath);
    }),
  );

  readonly isReadingFile$: Observable<boolean> = combineLatest([
    this.selectedFilePath$,
    this.clientId$,
    this.agentId$,
  ]).pipe(
    switchMap(([filePath, clientId, agentId]) => {
      if (!filePath || !clientId || !agentId) {
        return of(false);
      }
      // Only show loading if we don't have cached data (silent refresh)
      return combineLatest([
        this.filesFacade.isReadingFile$(clientId, agentId, filePath),
        this.filesFacade.getFileContent$(clientId, agentId, filePath),
      ]).pipe(
        map(([isLoading, cachedData]) => {
          // Show loading only if loading AND no cached data exists
          return isLoading && !cachedData;
        }),
      );
    }),
  );

  readonly isWritingFile$: Observable<boolean> = combineLatest([
    this.selectedFilePath$,
    this.clientId$,
    this.agentId$,
  ]).pipe(
    switchMap(([filePath, clientId, agentId]) => {
      if (!filePath || !clientId || !agentId) {
        return of(false);
      }
      return this.filesFacade.isWritingFile$(clientId, agentId, filePath);
    }),
  );

  readonly isDirty = computed(() => {
    const filePath = this.selectedFilePath();
    return filePath ? this.dirtyFiles().has(filePath) : false;
  });

  // Convert observable to signal for proper cleanup
  private readonly selectedFileContentSignal = toSignal(this.selectedFileContent$, {
    initialValue: null,
  });

  constructor() {
    // Load file when selected
    effect(() => {
      const filePath = this.selectedFilePath();
      if (filePath && this.clientId() && this.agentId()) {
        this.filesFacade.readFile(this.clientId(), this.agentId(), filePath);
      }
    });

    // Update editor content only when a new file is selected (not when user edits)
    effect(() => {
      const filePath = this.selectedFilePath();
      const content = this.selectedFileContentSignal();

      // Only update editorContent if:
      // 1. We have content
      // 2. The file path changed (new file selected) OR it's the first load
      if (content && filePath && filePath !== this.lastLoadedFilePath()) {
        // Content is already base64-encoded, pass it directly
        this.editorContent.set(content.content);
        this.lastLoadedFilePath.set(filePath);
      }
    });
  }

  onFileSelect(filePath: string): void {
    // Check if current file is dirty
    const currentPath = this.selectedFilePath();
    if (currentPath && this.dirtyFiles().has(currentPath)) {
      // TODO: Show confirmation dialog
    }

    this.selectedFilePath.set(filePath);
    this.dirtyFiles.update((dirty) => {
      const newDirty = new Set(dirty);
      newDirty.delete(currentPath || '');
      return newDirty;
    });
  }

  onContentChange(content: string | Event): void {
    // Handle both string and Event types (defensive programming)
    let contentValue: string;
    if (typeof content === 'string') {
      contentValue = content;
    } else if (content instanceof Event) {
      // If it's an Event, try to get the value from the target
      const target = content.target as HTMLInputElement | HTMLTextAreaElement;
      contentValue = target?.value || '';
    } else {
      return;
    }

    const filePath = this.selectedFilePath();
    if (filePath) {
      this.editorContent.set(contentValue);
      this.dirtyFiles.update((dirty) => {
        const newDirty = new Set(dirty);
        newDirty.add(filePath);
        return newDirty;
      });
    }
  }

  onSave(): void {
    const filePath = this.selectedFilePath();
    if (!filePath || !this.clientId() || !this.agentId()) {
      return;
    }

    // Get content from editorContent signal (updated by contentChange events)
    const contentToSave = this.editorContent();
    if (!contentToSave) {
      return;
    }

    const writeDto: WriteFileDto = {
      content: contentToSave, // Already base64-encoded
      encoding: 'utf-8',
    };

    this.filesFacade.writeFile(this.clientId(), this.agentId(), filePath, writeDto);

    // Mark as not dirty and sync editorContent after successful save
    combineLatest([this.isWritingFile$, this.selectedFileContent$])
      .pipe(
        filter(([writing]) => !writing),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([, savedContent]) => {
        // Update editorContent with saved content from server
        if (savedContent) {
          this.editorContent.set(savedContent.content);
        }
        // Mark as not dirty
        this.dirtyFiles.update((dirty) => {
          const newDirty = new Set(dirty);
          newDirty.delete(filePath);
          return newDirty;
        });
      });
  }

  onFileCreate(event: { path: string; type: 'file' | 'directory'; name: string }): void {
    const createDto: CreateFileDto = {
      type: event.type,
    };

    const fullPath = event.path === '.' ? event.name : `${event.path}/${event.name}`;
    this.filesFacade.createFileOrDirectory(this.clientId(), this.agentId(), fullPath, createDto);

    // Refresh directory listing
    this.filesFacade.listDirectory(this.clientId(), this.agentId(), { path: event.path });

    // If it's a file, select it
    if (event.type === 'file') {
      setTimeout(() => {
        this.selectedFilePath.set(fullPath);
      }, 500); // Wait for file to be created
    } else {
      // If it's a directory, expand it
      this.expandedPaths.update((expanded) => {
        const newExpanded = new Set(expanded);
        newExpanded.add(fullPath);
        return newExpanded;
      });
    }
  }

  onFileDelete(filePath: string): void {
    // Confirmation is handled by the file-tree component's Bootstrap modal
    this.filesFacade.deleteFileOrDirectory(this.clientId(), this.agentId(), filePath);

    // If deleted file was selected, clear selection
    if (this.selectedFilePath() === filePath) {
      this.selectedFilePath.set(null);
      this.dirtyFiles.update((dirty) => {
        const newDirty = new Set(dirty);
        newDirty.delete(filePath);
        return newDirty;
      });
    }

    // Refresh root directory listing
    this.filesFacade.listDirectory(this.clientId(), this.agentId(), { path: '.' });
  }

  onDirectoryExpand(path: string | Event): void {
    // Handle both string and Event types (defensive programming)
    const pathValue = typeof path === 'string' ? path : '';
    if (!pathValue) {
      return;
    }
    this.expandedPaths.update((expanded) => {
      const newExpanded = new Set(expanded);
      newExpanded.add(pathValue);
      return newExpanded;
    });
  }

  onDirectoryCollapse(path: string | Event): void {
    // Handle both string and Event types (defensive programming)
    const pathValue = typeof path === 'string' ? path : '';
    if (!pathValue) {
      return;
    }
    this.expandedPaths.update((expanded) => {
      const newExpanded = new Set(expanded);
      newExpanded.delete(pathValue);
      return newExpanded;
    });
  }

  /**
   * Refresh the file tree and reload file content while preserving state.
   * This method reloads directory listings and file content without losing
   * the currently selected file or expanded folder state.
   */
  refresh(): void {
    const clientId = this.clientId();
    const agentId = this.agentId();
    if (!clientId || !agentId) {
      return;
    }

    // Save current state
    const currentSelectedFile = this.selectedFilePath();
    const currentExpandedPaths = new Set(this.expandedPaths());

    // Reload all expanded directories (including root)
    // Use a small delay for root to avoid immediate cancellation from the file tree component's effect
    currentExpandedPaths.forEach((path) => {
      if (path === '.') {
        // Small delay for root directory to avoid cancellation
        setTimeout(() => {
          this.filesFacade.listDirectory(clientId, agentId, { path: '.' });
        }, 50);
      } else {
        this.filesFacade.listDirectory(clientId, agentId, { path });
      }
    });

    // If root is not in expanded paths, reload it anyway (it's always needed)
    if (!currentExpandedPaths.has('.')) {
      setTimeout(() => {
        this.filesFacade.listDirectory(clientId, agentId, { path: '.' });
      }, 50);
    }

    // Reload currently selected file if it exists
    if (currentSelectedFile) {
      this.filesFacade.readFile(clientId, agentId, currentSelectedFile);
    }
  }
}
