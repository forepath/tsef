import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  FilesFacade,
  moveFileOrDirectorySuccess,
  type CreateFileDto,
  type FileContentDto,
  type OpenTab,
  type WriteFileDto,
} from '@forepath/framework/frontend/data-access-agent-console';
import { Actions, ofType } from '@ngrx/effects';
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
export class FileEditorComponent implements OnDestroy, AfterViewInit {
  private readonly filesFacade = inject(FilesFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actions$ = inject(Actions);

  @ViewChild('tabsContainer', { static: false }) tabsContainerRef?: ElementRef<HTMLDivElement>;
  @ViewChild('tabsWrapper', { static: false }) tabsWrapperRef?: ElementRef<HTMLDivElement>;

  // Inputs
  clientId = input.required<string>();
  agentId = input.required<string>();
  chatVisible = input<boolean>(true);

  // Internal state
  selectedFilePath = signal<string | null>(null);
  expandedPaths = signal<Set<string>>(new Set());
  dirtyFiles = signal<Set<string>>(new Set());
  editorContent = signal<string>('');
  lastLoadedFilePath = signal<string | null>(null);
  visibleTabs = signal<OpenTab[]>([]);
  overflowedTabs = signal<OpenTab[]>([]);
  showMoreFilesDropdown = signal<boolean>(false);
  private allTabs = signal<OpenTab[]>([]);

  // Visibility toggles (exposed for parent component access)
  readonly fileTreeVisible = signal<boolean>(true);

  // Outputs
  readonly chatToggleRequested = output<void>();

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

  // Open tabs
  readonly openTabs$: Observable<OpenTab[]> = combineLatest([this.clientId$, this.agentId$]).pipe(
    switchMap(([clientId, agentId]) => {
      if (!clientId || !agentId) {
        return of([]);
      }
      return this.filesFacade.getOpenTabs$(clientId, agentId);
    }),
  );

  private resizeObserver?: ResizeObserver;

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

    // Calculate visible tabs when tabs change
    effect(() => {
      this.openTabs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((tabs) => {
        this.allTabs.set(tabs);
        // Initially show all tabs, then calculate visible ones after DOM updates
        this.visibleTabs.set(tabs);
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          setTimeout(() => {
            this.calculateVisibleTabs();
            // If the selected file is in overflowed tabs, move it to front
            const selectedPath = this.selectedFilePath();
            if (selectedPath && this.clientId() && this.agentId()) {
              const overflowed = this.overflowedTabs();
              const isOverflowed = overflowed.some((tab) => tab.filePath === selectedPath);
              if (isOverflowed) {
                this.filesFacade.moveTabToFront(this.clientId(), this.agentId(), selectedPath);
                // Recalculate after moving
                setTimeout(() => this.calculateVisibleTabs(), 50);
              }
            }
          }, 0);
        });
      });
    });

    // Recalculate tabs when file tree visibility changes
    effect(() => {
      // Access the signal to create dependency
      this.fileTreeVisible();
      // Recalculate after DOM updates - use longer delay to ensure layout is complete
      if (this.tabsContainerRef?.nativeElement) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              this.calculateVisibleTabs();
            }, 200);
          });
        });
      }
    });

    // Listen for file move/rename success and update selected file if it was moved
    this.actions$.pipe(ofType(moveFileOrDirectorySuccess), takeUntilDestroyed(this.destroyRef)).subscribe((action) => {
      const currentSelectedPath = this.selectedFilePath();
      const clientId = this.clientId();
      const agentId = this.agentId();

      // Check if the moved file is currently selected
      if (currentSelectedPath === action.sourcePath && clientId === action.clientId && agentId === action.agentId) {
        // Update selected file path to the new destination
        this.selectedFilePath.set(action.destinationPath);

        // Move dirty state from old path to new path if file was dirty
        const wasDirty = this.dirtyFiles().has(action.sourcePath);
        if (wasDirty) {
          this.dirtyFiles.update((dirty) => {
            const newDirty = new Set(dirty);
            newDirty.delete(action.sourcePath);
            newDirty.add(action.destinationPath);
            return newDirty;
          });
        }

        // Update lastLoadedFilePath to trigger content reload
        this.lastLoadedFilePath.set(null);

        // Load the file content at the new location
        // The effect will automatically load it when selectedFilePath changes
        this.filesFacade.readFile(clientId, agentId, action.destinationPath);
      }
    });
  }

  ngAfterViewInit(): void {
    // Set up ResizeObserver to detect overflow
    if (this.tabsContainerRef?.nativeElement && this.tabsWrapperRef?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          setTimeout(() => this.calculateVisibleTabs(), 0);
        });
      });
      this.resizeObserver.observe(this.tabsContainerRef.nativeElement);
      this.resizeObserver.observe(this.tabsWrapperRef.nativeElement);
    }
    // Initial calculation after view init
    setTimeout(() => this.calculateVisibleTabs(), 100);
  }

  /**
   * Public method to trigger tab recalculation.
   * Called by parent component when chat visibility changes.
   */
  recalculateTabs(): void {
    // Use double requestAnimationFrame and longer delay to ensure layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (this.tabsContainerRef?.nativeElement) {
            this.calculateVisibleTabs();
          }
        }, 200);
      });
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

    // Open tab when file is selected
    // The effect will automatically move it to front if it ends up in overflow
    if (this.clientId() && this.agentId()) {
      this.filesFacade.openFileTab(this.clientId(), this.agentId(), filePath);
    }
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

  getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  onTabClick(filePath: string): void {
    this.selectedFilePath.set(filePath);
  }

  onTabClickFromDropdown(filePath: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    // Move the tab to the front before selecting it
    if (this.clientId() && this.agentId()) {
      this.filesFacade.moveTabToFront(this.clientId(), this.agentId(), filePath);
    }

    this.onTabClick(filePath);

    // Close Bootstrap dropdown
    const dropdownElement = (event.target as HTMLElement).closest('.dropdown');
    if (dropdownElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bootstrap = (window as any).bootstrap;
      const toggleButton = dropdownElement.querySelector('[data-bs-toggle="dropdown"]');
      if (bootstrap?.Dropdown && toggleButton) {
        const dropdown = bootstrap.Dropdown.getInstance(toggleButton);
        if (dropdown) {
          dropdown.hide();
        }
      }
    }

    // Recalculate visible tabs after moving to front
    setTimeout(() => this.calculateVisibleTabs(), 100);
  }

  onTabDoubleClick(filePath: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.clientId() && this.agentId()) {
      this.filesFacade.pinFileTab(this.clientId(), this.agentId(), filePath);
    }
  }

  onTabClose(filePath: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.clientId() && this.agentId()) {
      this.filesFacade.closeFileTab(this.clientId(), this.agentId(), filePath);
      // If the closed tab was selected, select the first remaining tab or clear selection
      if (this.selectedFilePath() === filePath) {
        this.openTabs$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe((tabs) => {
          const remainingTabs = tabs.filter((tab) => tab.filePath !== filePath);
          if (remainingTabs.length > 0) {
            this.selectedFilePath.set(remainingTabs[0].filePath);
          } else {
            this.selectedFilePath.set(null);
          }
        });
      }
    }
  }

  private calculateVisibleTabs(): void {
    const container = this.tabsContainerRef?.nativeElement;
    const wrapper = this.tabsWrapperRef?.nativeElement;
    if (!container || !wrapper) {
      return;
    }

    const tabs = this.allTabs();
    if (tabs.length === 0) {
      this.visibleTabs.set([]);
      this.overflowedTabs.set([]);
      this.showMoreFilesDropdown.set(false);
      return;
    }

    // First, temporarily show all tabs so we can measure them accurately
    // This ensures we get correct measurements even if some were previously hidden
    this.visibleTabs.set(tabs);

    // Force a reflow to ensure all tabs are rendered
    void container.offsetHeight;

    // Now get the actual container width after layout
    const containerWidth = container.clientWidth;
    const moreButtonWidth = 60; // Approximate width of "more files" button
    const availableWidth = containerWidth - moreButtonWidth;

    // Get all currently rendered tab elements (should be all tabs now)
    const tabElements = Array.from(wrapper.querySelectorAll<HTMLElement>('.file-editor-tab'));

    if (tabElements.length === 0) {
      // No tabs rendered yet, wait a bit more
      setTimeout(() => this.calculateVisibleTabs(), 50);
      return;
    }

    // If we don't have all tabs rendered yet, wait a bit more
    if (tabElements.length < tabs.length) {
      setTimeout(() => this.calculateVisibleTabs(), 50);
      return;
    }

    let totalWidth = 0;
    const visible: OpenTab[] = [];
    const overflowed: OpenTab[] = [];

    // Measure tabs and determine which fit
    for (let i = 0; i < tabs.length; i++) {
      const tabElement = tabElements[i];
      const tab = tabs[i];
      if (!tabElement) {
        // Tab element not found, skip it
        overflowed.push(tab);
        continue;
      }

      const tabWidth = tabElement.offsetWidth || tabElement.getBoundingClientRect().width;

      if (totalWidth + tabWidth <= availableWidth) {
        visible.push(tab);
        totalWidth += tabWidth;
      } else {
        // This tab and all remaining tabs overflow
        overflowed.push(...tabs.slice(i));
        break;
      }
    }

    // If we measured fewer tabs than we have, the rest are overflowed
    if (visible.length < tabs.length && overflowed.length === 0) {
      overflowed.push(...tabs.slice(visible.length));
    }

    // Check if the selected file is in overflowed tabs - if so, move it to front
    const selectedPath = this.selectedFilePath();
    if (selectedPath && this.clientId() && this.agentId()) {
      const isOverflowed = overflowed.some((tab) => tab.filePath === selectedPath);
      if (isOverflowed) {
        // Move selected tab to front and recalculate
        this.filesFacade.moveTabToFront(this.clientId(), this.agentId(), selectedPath);
        // The tab order change will trigger a recalculation via the effect
        // But we also need to recalculate immediately to show the change
        setTimeout(() => this.calculateVisibleTabs(), 50);
        return;
      }
    }

    // Now set the actual visible/overflowed tabs
    this.visibleTabs.set(visible);
    this.overflowedTabs.set(overflowed);
    this.showMoreFilesDropdown.set(overflowed.length > 0);
  }

  onToggleFileTree(): void {
    this.fileTreeVisible.update((visible) => !visible);
    // Explicitly trigger recalculation after toggling
    this.recalculateTabs();
  }

  onToggleChat(): void {
    this.chatToggleRequested.emit();
  }

  ngOnDestroy(): void {
    // Clear all open tabs when component is destroyed
    if (this.clientId() && this.agentId()) {
      this.filesFacade.clearOpenTabs(this.clientId(), this.agentId());
    }
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
