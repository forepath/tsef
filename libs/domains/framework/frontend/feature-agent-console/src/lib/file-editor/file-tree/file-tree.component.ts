import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FilesFacade, type FileNodeDto } from '@forepath/framework/frontend/data-access-agent-console';
import { combineLatest, filter, map, Observable, of, Subscription, switchMap, take } from 'rxjs';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
  children?: TreeNode[];
  expanded?: boolean;
  loading?: boolean;
}

@Component({
  selector: 'framework-file-tree',
  imports: [CommonModule, FormsModule],
  templateUrl: './file-tree.component.html',
  styleUrls: ['./file-tree.component.scss'],
  standalone: true,
})
export class FileTreeComponent implements OnInit {
  private readonly filesFacade = inject(FilesFacade);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('deleteFileModal', { static: false })
  private deleteFileModal!: ElementRef<HTMLDivElement>;

  // Inputs
  clientId = input.required<string>();
  agentId = input.required<string>();
  expandedPaths = input<Set<string>>(new Set());
  selectedPath = input<string | null>(null);

  // Outputs
  fileSelect = output<string>();
  fileCreate = output<{ path: string; type: 'file' | 'directory'; name: string }>();
  fileDelete = output<string>();
  directoryExpand = output<string>();
  directoryCollapse = output<string>();

  // Internal state
  treeNodes = signal<TreeNode[]>([]);
  treeCache = signal<Map<string, FileNodeDto[]>>(new Map());
  contextMenuPath = signal<string | null>(null);
  contextMenuPosition = signal<{ x: number; y: number } | null>(null);
  creatingItem = signal<{ path: string; type: 'file' | 'directory' } | null>(null);
  newItemName = signal<string>('');
  itemToDelete = signal<{ path: string; type: 'file' | 'directory' } | null>(null);
  private expandedDirectorySubscriptions = new Map<string, Subscription>();

  // Computed observables for directory listings - convert computed signals to observables
  private readonly rootDirectorySignal = computed(() => {
    const clientId = this.clientId();
    const agentId = this.agentId();
    if (!clientId || !agentId) {
      return null;
    }
    // Return a placeholder - we'll use toObservable to convert the signal
    return { clientId, agentId };
  });

  readonly rootDirectory$: Observable<FileNodeDto[] | null> = toObservable(this.rootDirectorySignal).pipe(
    switchMap((config) => {
      if (!config) {
        return of(null);
      }
      return this.filesFacade.getDirectoryListing$(config.clientId, config.agentId, '.');
    }),
  );

  private readonly rootLoadingSignal = computed(() => {
    const clientId = this.clientId();
    const agentId = this.agentId();
    if (!clientId || !agentId) {
      return false;
    }
    return { clientId, agentId };
  });

  readonly rootLoading$: Observable<boolean> = toObservable(this.rootLoadingSignal).pipe(
    switchMap((config) => {
      if (!config || typeof config === 'boolean') {
        return of(false);
      }
      // Only show loading if we don't have cached data (silent refresh)
      return combineLatest([
        this.filesFacade.isListingDirectory$(config.clientId, config.agentId, '.'),
        this.filesFacade.getDirectoryListing$(config.clientId, config.agentId, '.'),
      ]).pipe(
        map(([isLoading, cachedData]) => {
          // Show loading only if loading AND no cached data exists
          return isLoading && !cachedData;
        }),
      );
    }),
  );

  // Helper to get directory listing observable
  getDirectoryListing$(path: string): Observable<FileNodeDto[] | null> {
    return this.filesFacade.getDirectoryListing$(this.clientId(), this.agentId(), path);
  }

  // Helper to get directory loading observable
  getDirectoryLoading$(path: string): Observable<boolean> {
    return this.filesFacade.isListingDirectory$(this.clientId(), this.agentId(), path);
  }

  constructor() {
    // Load root directory on init
    effect(() => {
      const clientId = this.clientId();
      const agentId = this.agentId();
      if (clientId && agentId) {
        this.filesFacade.listDirectory(clientId, agentId, { path: '.' });
      }
    });

    // Subscribe to all expanded directory listings to rebuild tree when they change
    effect(() => {
      const clientId = this.clientId();
      const agentId = this.agentId();
      const expanded = this.expandedPaths();

      if (!clientId || !agentId) {
        // Clean up all subscriptions if client/agent is not available
        this.expandedDirectorySubscriptions.forEach((subscription) => subscription.unsubscribe());
        this.expandedDirectorySubscriptions.clear();
        return;
      }

      // Get current expanded paths (excluding root)
      const expandedPathsArray = Array.from(expanded).filter((path) => path !== '.');
      const currentPaths = new Set(expandedPathsArray);

      // Unsubscribe from directories that are no longer expanded
      for (const [path, subscription] of this.expandedDirectorySubscriptions.entries()) {
        if (!currentPaths.has(path)) {
          subscription.unsubscribe();
          this.expandedDirectorySubscriptions.delete(path);
        }
      }

      // Subscribe to newly expanded directories
      for (const path of expandedPathsArray) {
        if (!this.expandedDirectorySubscriptions.has(path)) {
          // Subscribe to directory listing changes
          const subscription = this.getDirectoryListing$(path)
            .pipe(
              filter((listing) => listing !== null),
              takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((listing) => {
              if (listing) {
                this.updateTreeCache(path, listing);
                this.rebuildTree();
              }
            });
          this.expandedDirectorySubscriptions.set(path, subscription);
        }
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to root directory observable with proper cleanup
    this.rootDirectory$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((nodes) => {
      if (nodes) {
        this.updateTreeCache('.', nodes);
        this.rebuildTree();
      }
    });
  }

  onFileClick(node: TreeNode, event: MouseEvent): void {
    event.stopPropagation();
    if (node.type === 'file') {
      this.fileSelect.emit(node.path);
    } else {
      this.onDirectoryToggle(node);
    }
  }

  onDirectoryToggle(node: TreeNode): void {
    if (node.type !== 'directory') {
      return;
    }

    const isExpanded = this.expandedPaths().has(node.path);

    if (isExpanded) {
      // Collapse
      this.directoryCollapse.emit(node.path);
    } else {
      // Expand - load directory if not cached
      const hasCachedData = this.treeCache().has(node.path);
      if (!hasCachedData) {
        // Only show loading if we don't have cached data (silent refresh)
        node.loading = true;
        this.filesFacade.listDirectory(this.clientId(), this.agentId(), { path: node.path });
        // Subscribe to directory listing
        this.getDirectoryListing$(node.path)
          .pipe(
            filter((listing) => listing !== null),
            take(1),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe((listing) => {
            if (listing) {
              this.updateTreeCache(node.path, listing);
              node.loading = false;
              this.rebuildTree();
            }
          });
      } else {
        // We have cached data, but still reload to get fresh data (silent)
        this.filesFacade.listDirectory(this.clientId(), this.agentId(), { path: node.path });
      }
      this.directoryExpand.emit(node.path);
    }
  }

  onContextMenu(event: MouseEvent, node: TreeNode): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuPath.set(node.path);
    this.contextMenuPosition.set({ x: event.clientX, y: event.clientY });
  }

  onCloseContextMenu(): void {
    this.contextMenuPath.set(null);
    this.contextMenuPosition.set(null);
  }

  onCreateItem(type: 'file' | 'directory', parentPath?: string): void {
    const path = parentPath || '.';
    this.creatingItem.set({ path, type });
    this.newItemName.set('');
  }

  onConfirmCreate(): void {
    const creating = this.creatingItem();
    if (!creating || !this.newItemName().trim()) {
      return;
    }

    const name = this.newItemName().trim();

    this.fileCreate.emit({
      path: creating.path,
      type: creating.type,
      name,
    });

    // Wait a bit for the file/directory to be created, then refresh the parent directory listing
    setTimeout(() => {
      this.filesFacade.listDirectory(this.clientId(), this.agentId(), { path: creating.path });
    }, 100);

    this.creatingItem.set(null);
    this.newItemName.set('');
  }

  onCancelCreate(): void {
    this.creatingItem.set(null);
    this.newItemName.set('');
  }

  onDeleteItem(path: string): void {
    // Find the node to get its type
    const node = this.findNodeByPath(path);
    if (node) {
      this.itemToDelete.set({ path, type: node.type });
      this.showModal(this.deleteFileModal);
      this.onCloseContextMenu();
    }
  }

  confirmDeleteItem(): void {
    const item = this.itemToDelete();
    if (item) {
      this.fileDelete.emit(item.path);
      this.hideModal(this.deleteFileModal);
      this.itemToDelete.set(null);

      // Determine parent directory path
      const parentPath = this.getParentPath(item.path);

      // Remove the deleted item from cache if it exists
      this.removeFromCache(item.path);

      // Refresh the parent directory listing to update the tree
      this.filesFacade.listDirectory(this.clientId(), this.agentId(), { path: parentPath });
    }
  }

  private getParentPath(path: string): string {
    if (path === '.' || !path.includes('/')) {
      return '.';
    }
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      return '.';
    }
    return path.substring(0, lastSlashIndex) || '.';
  }

  private removeFromCache(path: string): void {
    const cache = new Map(this.treeCache());

    // Remove the deleted item from its parent directory's cache
    const parentPath = this.getParentPath(path);
    const parentListing = cache.get(parentPath);
    if (parentListing) {
      const updatedListing = parentListing.filter((node) => node.path !== path);
      cache.set(parentPath, updatedListing);
    }

    // Remove the item's own cache entry
    cache.delete(path);

    // If it's a directory, recursively remove all child directory cache entries
    // Child paths will be like "parent/child" or "parent/child/grandchild"
    if (path !== '.') {
      const pathPrefix = `${path}/`;
      const keysToDelete: string[] = [];
      for (const cacheKey of cache.keys()) {
        // Remove all cache entries that start with the deleted path (its children)
        if (cacheKey.startsWith(pathPrefix)) {
          keysToDelete.push(cacheKey);
        }
      }
      keysToDelete.forEach((key) => cache.delete(key));
    }

    // Update cache and rebuild tree immediately to reflect the removal
    this.treeCache.set(cache);
    this.rebuildTree();
  }

  findNodeByPath(path: string): TreeNode | null {
    const findInNodes = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.path === path) {
          return node;
        }
        if (node.children) {
          const found = findInNodes(node.children);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    return findInNodes(this.treeNodes());
  }

  private showModal(modalElement: ElementRef<HTMLDivElement>): void {
    if (modalElement?.nativeElement) {
      // Use Bootstrap 5 Modal API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = (window as any).bootstrap?.Modal?.getOrCreateInstance(modalElement.nativeElement);
      if (modal) {
        modal.show();
      } else {
        // Fallback: create new modal instance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Modal = (window as any).bootstrap?.Modal;
        if (Modal) {
          new Modal(modalElement.nativeElement).show();
        }
      }
    }
  }

  private hideModal(modalElement: ElementRef<HTMLDivElement>): void {
    if (modalElement?.nativeElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement.nativeElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  private updateTreeCache(path: string, nodes: FileNodeDto[]): void {
    const cache = new Map(this.treeCache());
    cache.set(path, nodes);
    this.treeCache.set(cache);
  }

  private rebuildTree(): void {
    const rootNodes = this.treeCache().get('.') || [];
    const expanded = this.expandedPaths();
    const tree = this.buildTree(rootNodes, '.', expanded);
    this.treeNodes.set(tree);
  }

  private buildTree(nodes: FileNodeDto[], basePath: string, expandedPaths: Set<string>): TreeNode[] {
    const tree: TreeNode[] = [];

    for (const node of nodes) {
      const isExpanded = expandedPaths.has(node.path);
      const children: TreeNode[] = [];

      // If directory is expanded, load its children
      if (node.type === 'directory' && isExpanded) {
        const childNodes = this.treeCache().get(node.path) || [];
        children.push(...this.buildTree(childNodes, node.path, expandedPaths));
      }

      tree.push({
        name: node.name,
        path: node.path,
        type: node.type,
        size: node.size,
        modifiedAt: node.modifiedAt,
        children: children.length > 0 ? children : undefined,
        expanded: isExpanded,
      });
    }

    // Sort: directories first, then files, both alphabetically
    tree.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return tree;
  }

  getIcon(node: TreeNode): string {
    if (node.type === 'directory') {
      return node.expanded ? 'bi-folder2-open' : 'bi-folder';
    }
    // File icons based on extension
    const ext = node.name.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      ts: 'bi-filetype-ts',
      js: 'bi-filetype-js',
      json: 'bi-filetype-json',
      html: 'bi-filetype-html',
      css: 'bi-filetype-css',
      scss: 'bi-filetype-scss',
      md: 'bi-filetype-md',
      yaml: 'bi-filetype-yml',
      yml: 'bi-filetype-yml',
      xml: 'bi-filetype-xml',
      py: 'bi-filetype-py',
      java: 'bi-filetype-java',
      c: 'bi-filetype-c',
      cpp: 'bi-filetype-cpp',
      php: 'bi-filetype-php',
      go: 'bi-filetype-go',
      rs: 'bi-filetype-rs',
      vue: 'bi-filetype-vue',
    };
    return iconMap[ext || ''] || 'bi-file-earmark';
  }

  getLevelArray(level: number): number[] {
    return Array.from({ length: level }, (_, i) => i);
  }

  onRefreshRoot(): void {
    // Refresh root and all expanded directories
    const expanded = this.expandedPaths();
    const pathsToRefresh = new Set<string>();

    // Always refresh root
    pathsToRefresh.add('.');

    // Add all expanded directories
    expanded.forEach((path) => {
      if (path !== '.') {
        pathsToRefresh.add(path);
      }
    });

    // Refresh all paths with small delays to prevent cancellation
    const pathsArray = Array.from(pathsToRefresh);
    pathsArray.forEach((path, index) => {
      setTimeout(() => {
        this.filesFacade.listDirectory(this.clientId(), this.agentId(), { path });
      }, index * 50); // 50ms delay between each call
    });
  }

  onRefreshFolder(folderPath: string): void {
    // Refresh the folder and all its expanded subfolders recursively
    const expanded = this.expandedPaths();
    const pathsToRefresh = new Set<string>();

    // Always refresh the folder itself
    pathsToRefresh.add(folderPath);

    // Find all expanded subdirectories under this folder
    const folderPrefix = folderPath === '.' ? '' : `${folderPath}/`;
    expanded.forEach((path) => {
      // Include if it's a subdirectory of the folder
      if (path !== folderPath && (folderPath === '.' || path.startsWith(folderPrefix))) {
        pathsToRefresh.add(path);
      }
    });

    // Refresh all paths with small delays to prevent cancellation
    // Sort paths to refresh parent before children
    const pathsArray = Array.from(pathsToRefresh).sort((a, b) => {
      // Sort by depth (shorter paths first) to refresh parents before children
      const depthA = a === '.' ? 0 : a.split('/').length;
      const depthB = b === '.' ? 0 : b.split('/').length;
      return depthA - depthB;
    });

    pathsArray.forEach((path, index) => {
      setTimeout(() => {
        this.filesFacade.listDirectory(this.clientId(), this.agentId(), { path });
      }, index * 50); // 50ms delay between each call
    });
  }
}
