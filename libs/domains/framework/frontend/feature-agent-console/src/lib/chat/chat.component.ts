import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  SecurityContext,
  signal,
  ViewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  AgentsFacade,
  ClientsFacade,
  FilesFacade,
  SocketsFacade,
  type AgentResponseDto,
  type ChatMessageData,
  type ClientAuthenticationType,
  type ClientResponseDto,
  type CreateAgentDto,
  type CreateClientDto,
  type ForwardedEventPayload,
  type UpdateAgentDto,
  type UpdateClientDto,
} from '@forepath/framework/frontend/data-access-agent-console';
import { ENVIRONMENT, type Environment } from '@forepath/framework/frontend/util-configuration';
import {
  combineLatest,
  combineLatestWith,
  delay,
  filter,
  map,
  Observable,
  of,
  skip,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs';
import { FileEditorComponent } from '../file-editor/file-editor.component';
import { StandaloneLoadingService } from '../standalone-loading.service';

// Type declaration for marked library
interface Marked {
  parse(markdown: string, options?: { breaks?: boolean; gfm?: boolean }): string;
}

@Component({
  selector: 'framework-agent-console-chat',
  imports: [CommonModule, RouterModule, FormsModule, FileEditorComponent],
  styleUrls: ['./chat.component.scss'],
  templateUrl: './chat.component.html',
  standalone: true,
})
export class AgentConsoleChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  private readonly clientsFacade = inject(ClientsFacade);
  private readonly agentsFacade = inject(AgentsFacade);
  private readonly socketsFacade = inject(SocketsFacade);
  private readonly filesFacade = inject(FilesFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly environment = inject<Environment>(ENVIRONMENT);
  private readonly standaloneLoadingService = inject(StandaloneLoadingService);

  @ViewChild('chatMessagesContainer', { static: false })
  private chatMessagesContainer!: ElementRef<HTMLDivElement>;

  @ViewChild('deleteClientModal', { static: false })
  private deleteClientModal!: ElementRef<HTMLDivElement>;

  @ViewChild('deleteAgentModal', { static: false })
  private deleteAgentModal!: ElementRef<HTMLDivElement>;

  @ViewChild('addClientModal', { static: false })
  private addClientModal!: ElementRef<HTMLDivElement>;

  @ViewChild('addAgentModal', { static: false })
  private addAgentModal!: ElementRef<HTMLDivElement>;

  @ViewChild('updateClientModal', { static: false })
  private updateClientModal!: ElementRef<HTMLDivElement>;

  @ViewChild('updateAgentModal', { static: false })
  private updateAgentModal!: ElementRef<HTMLDivElement>;

  @ViewChild('fileEditor', { static: false })
  fileEditor!: FileEditorComponent;

  @ViewChild('shareFileLinkButton', { static: false })
  shareFileLinkButton!: ElementRef<HTMLButtonElement>;

  private shareButtonTooltip: any = null;

  // Cache for marked instance to avoid repeated async imports
  private markedInstance: Marked | null = null;
  private markedLoadPromise: Promise<Marked> | null = null;

  // Client list observables
  readonly clients$: Observable<ClientResponseDto[]> = this.clientsFacade.clients$;
  readonly activeClientId$: Observable<string | null> = this.clientsFacade.activeClientId$;
  readonly activeClient$: Observable<ClientResponseDto | null> = this.clientsFacade.activeClient$;
  readonly clientsLoading$: Observable<boolean> = this.clientsFacade.loading$;
  readonly clientsError$: Observable<string | null> = this.clientsFacade.error$;
  readonly clientsDeleting$: Observable<boolean> = this.clientsFacade.deleting$;
  readonly clientsCreating$: Observable<boolean> = this.clientsFacade.creating$;
  readonly clientsUpdating$: Observable<boolean> = this.clientsFacade.updating$;

  // Agent list observables (computed based on active client)
  readonly agents$: Observable<AgentResponseDto[]> = this.activeClientId$.pipe(
    switchMap((clientId) => {
      if (!clientId) {
        return of([]);
      }
      return this.agentsFacade.getClientAgents$(clientId);
    }),
  );
  readonly agentsLoading$: Observable<boolean> = this.activeClientId$.pipe(
    switchMap((clientId) => {
      if (!clientId) {
        return of(false);
      }
      return this.agentsFacade.getClientAgentsLoading$(clientId);
    }),
  );
  readonly agentsDeleting$: Observable<boolean> = this.activeClientId$.pipe(
    switchMap((clientId) => {
      if (!clientId) {
        return of(false);
      }
      return this.agentsFacade.getClientAgentsDeleting$(clientId);
    }),
  );
  readonly agentsCreating$: Observable<boolean> = this.activeClientId$.pipe(
    switchMap((clientId) => {
      if (!clientId) {
        return of(false);
      }
      return this.agentsFacade.getClientAgentsCreating$(clientId);
    }),
  );
  readonly agentsUpdating$: Observable<boolean> = this.activeClientId$.pipe(
    switchMap((clientId) => {
      if (!clientId) {
        return of(false);
      }
      return this.agentsFacade.getClientAgentsUpdating$(clientId);
    }),
  );
  readonly selectedAgent$: Observable<AgentResponseDto | null> = this.activeClientId$.pipe(
    switchMap((clientId) => {
      if (!clientId) {
        return of(null);
      }
      return this.agentsFacade.getSelectedClientAgent$(clientId);
    }),
  );

  // Commands observables (computed based on active client and selected agent)
  readonly commands$: Observable<string[]> = combineLatest([this.activeClientId$, this.selectedAgent$]).pipe(
    switchMap(([clientId, agent]) => {
      if (!clientId || !agent) {
        return of([]);
      }
      return this.agentsFacade.getClientAgentCommands$(clientId, agent.id);
    }),
  );
  readonly commandsLoading$: Observable<boolean> = combineLatest([this.activeClientId$, this.selectedAgent$]).pipe(
    switchMap(([clientId, agent]) => {
      if (!clientId || !agent) {
        return of(false);
      }
      return this.agentsFacade.getClientAgentLoadingCommands$(clientId, agent.id);
    }),
  );

  // Socket observables
  readonly socketConnected$: Observable<boolean> = this.socketsFacade.connected$;
  readonly socketConnecting$: Observable<boolean> = this.socketsFacade.connecting$;
  readonly socketDisconnecting$: Observable<boolean> = this.socketsFacade.disconnecting$;
  readonly selectedClientId$: Observable<string | null> = this.socketsFacade.selectedClientId$;
  readonly chatMessages$ = this.socketsFacade.getForwardedEventsByEvent$('chatMessage');
  readonly forwarding$: Observable<boolean> = this.socketsFacade.chatForwarding$;
  readonly socketError$: Observable<string | null> = this.socketsFacade.error$;

  // Local state
  chatMessage = signal<string>('');
  selectedChatModel = signal<string | null>('auto');
  selectedCommand = signal<string | null>(null);
  selectedAgentId = signal<string | null>(null);
  editorOpen = signal<boolean>(false);
  chatVisible = signal<boolean>(true);
  private previousAgentId: string | null = null;
  readonly fileOnlyMode = signal<boolean>(false);
  readonly standaloneMode = signal<boolean>(false);
  private standaloneFileLoaded = false;

  // Convert signals to observables (must be in field initializer for injection context)
  private readonly standaloneMode$ = toObservable(this.standaloneMode);

  readonly chatModelOptions = Object.entries(this.environment.chatModelOptions ?? {}).map(([value, label]) => ({
    value,
    label,
  }));

  // Computed observable to determine if chat should be visible
  readonly shouldShowChat$ = combineLatest([
    this.selectedAgent$,
    toObservable(this.editorOpen),
    toObservable(this.chatVisible),
  ]).pipe(
    map(([selectedAgent, editorOpen, chatVisible]) => {
      if (!selectedAgent) {
        return false;
      }
      // Show chat if editor is not open, or if editor is open and chat is visible
      return !editorOpen || chatVisible;
    }),
  );

  // Computed signal to determine if we're waiting for an agent response
  // Works across windows by checking chat messages rather than just forwarding state
  readonly waitingForResponse$ = combineLatest([this.chatMessages$, this.socketError$]).pipe(
    map(([messages, error]) => {
      // If there's an error, we're not waiting
      if (error) {
        this.lastUserMessageTimestamp.set(null);
        return false;
      }

      // Filter to only chat messages (user and agent messages)
      const chatMessages = messages.filter(
        (msg) => this.isUserMessage(msg.payload) || this.isAgentMessage(msg.payload),
      );

      // Determine the timestamp of the last user message
      // Use the most recent user message from the array, or fall back to lastUserMessageTimestamp signal
      // if we've sent a message but it hasn't appeared in the array yet
      const userMessages = chatMessages.filter((msg) => this.isUserMessage(msg.payload));
      let lastUserMessageTimestamp: number | null = null;

      if (userMessages.length > 0) {
        const lastUserMessage = userMessages.reduce((latest, msg) => (msg.timestamp > latest.timestamp ? msg : latest));
        lastUserMessageTimestamp = lastUserMessage.timestamp;
      } else {
        // Check if we've sent a message but it's not yet in the messages array
        const sentMessageTimestamp = this.lastUserMessageTimestamp();
        if (sentMessageTimestamp) {
          lastUserMessageTimestamp = sentMessageTimestamp;
        }
      }

      // If we have no user message timestamp, we're not waiting
      if (!lastUserMessageTimestamp) {
        return false;
      }

      // Check if there's an agent message after the last user message
      const hasAgentResponse = chatMessages.some(
        (msg) => this.isAgentMessage(msg.payload) && msg.timestamp > lastUserMessageTimestamp,
      );

      // If we have an agent response, we're no longer waiting
      if (hasAgentResponse) {
        // Clear the timestamp if it was set
        this.lastUserMessageTimestamp.set(null);
        return false;
      }

      // We're waiting if there's a user message without a corresponding agent response
      // This works across windows since all windows receive the same chat messages
      return true;
    }),
  );
  private activeClientId: string | null = null;
  private shouldScrollToBottom = false;
  private previousMessageCount = 0;
  private readonly destroy$ = new Subject<void>();
  private lastUserMessageTimestamp = signal<number | null>(null);
  private lastAgentMessageTimestamp = 0;

  // Delete state
  readonly clientToDeleteId = signal<string | null>(null);
  readonly clientToDeleteName = signal<string>('');
  readonly agentToDeleteId = signal<string | null>(null);
  readonly agentToDeleteName = signal<string>('');

  // Add state
  readonly newClient = signal<Partial<CreateClientDto>>({
    name: '',
    description: '',
    endpoint: '',
    authenticationType: undefined,
    apiKey: undefined,
    keycloakClientId: undefined,
    keycloakClientSecret: undefined,
    keycloakRealm: undefined,
    agentWsPort: undefined,
  });
  readonly newAgent = signal<Partial<CreateAgentDto>>({
    name: '',
    description: '',
    agentType: undefined,
  });

  // Edit state
  readonly editingClientId = signal<string | null>(null);
  readonly editingClient = signal<Partial<UpdateClientDto & { authenticationType?: ClientAuthenticationType | '' }>>({
    name: '',
    description: '',
    endpoint: '',
    authenticationType: undefined,
    apiKey: undefined,
    keycloakClientId: undefined,
    keycloakClientSecret: undefined,
    keycloakRealm: undefined,
    agentWsPort: undefined,
  });
  readonly editingAgentId = signal<string | null>(null);
  readonly editingAgent = signal<Partial<UpdateAgentDto>>({
    name: '',
    description: '',
  });

  private initialRouting: Record<string, boolean> = {
    client: false,
    agent: false,
    editor: false,
  };
  private fileOpenedFromQuery = false;

  ngOnInit(): void {
    // Default chat model to auto mode on load
    this.socketsFacade.setChatModel(null);

    // Load clients on init
    this.clientsFacade.loadClients();

    this.route.params
      .pipe(
        combineLatestWith(this.clients$, this.agents$),
        withLatestFrom(this.route.queryParams),
        takeUntil(this.destroy$),
        delay(0),
      )
      .subscribe(([[params, clients, agents], queryParams]) => {
        // Select client from route params (only on initial load)
        if (!this.initialRouting['client'] && clients.length > 0) {
          const clientId = params['clientId'];
          if (clientId) {
            // Only select if not already selected to avoid race conditions
            if (this.activeClientId !== clientId) {
              this.onClientSelect(clientId, false);
            }
            this.initialRouting['client'] = true;
          }
        }

        // Select agent from route params (only on initial load)
        if (!this.initialRouting['agent'] && agents.length > 0) {
          const agentId = params['agentId'];
          if (agentId) {
            // Only select if not already selected to avoid race conditions
            const currentAgentId = this.selectedAgentId();
            if (currentAgentId !== agentId) {
              this.onAgentSelect(agentId, false);
            }
            this.initialRouting['agent'] = true;
          }
        }

        // Select editor from route params
        if (
          !this.initialRouting['editor'] &&
          agents.length > 0 &&
          this.router.url.includes('/editor') &&
          !this.editorOpen()
        ) {
          // Check if file query parameter is set
          const filePath = queryParams['file'];
          const isFileOnlyMode = !!filePath;
          this.fileOnlyMode.set(isFileOnlyMode);

          // Check if standalone query parameter is set
          const isStandaloneMode = !!queryParams['standalone'];
          this.standaloneMode.set(isStandaloneMode);
          if (isStandaloneMode && isFileOnlyMode) {
            // Loading spinner is shown by container component
            this.standaloneFileLoaded = false;
          }

          // Open editor if route has /editor but editor is closed
          this.editorOpen.set(true);

          if (isFileOnlyMode) {
            // Hide file tree and chat by default in file-only mode
            this.chatVisible.set(false);
            if (this.fileEditor) {
              this.fileEditor.fileTreeVisible.set(false);
              this.fileEditor.terminalVisible.set(false);
              this.fileEditor.autosaveEnabled.set(false);
            }
          } else {
            // Normal editor mode
            this.chatVisible.set(true);
            if (this.fileEditor) {
              this.fileEditor.fileTreeVisible.set(true);
              this.fileEditor.terminalVisible.set(false);
              this.fileEditor.autosaveEnabled.set(false);
            }
          }

          this.initialRouting['editor'] = true;

          // Open file if file query parameter is set
          if (isFileOnlyMode && filePath) {
            // Decode the file path (in case it's URL encoded)
            // Use try-catch to handle cases where path is already decoded
            let decodedFilePath: string;
            try {
              decodedFilePath = decodeURIComponent(filePath);
            } catch {
              decodedFilePath = filePath;
            }
            this.openFileWhenReady(decodedFilePath);
          }
        }
      });

    // Subscribe to query parameter changes to handle file-only mode (only for updates after initial load)
    // Use skip(1) to skip the first emission which is handled in initial routing
    this.route.queryParams
      .pipe(
        takeUntil(this.destroy$),
        skip(1), // Skip first emission (handled in initial routing)
      )
      .subscribe((queryParams) => {
        const filePath = queryParams['file'];
        const isFileOnlyMode = !!filePath;
        this.fileOnlyMode.set(isFileOnlyMode);

        // Check if standalone query parameter is set
        const isStandaloneMode = !!queryParams['standalone'];
        this.standaloneMode.set(isStandaloneMode);

        // If file query parameter is set and editor is open, open the file
        if (isFileOnlyMode && filePath && this.editorOpen()) {
          // Decode the file path (in case it's URL encoded)
          let decodedFilePath: string;
          try {
            decodedFilePath = decodeURIComponent(filePath);
          } catch {
            decodedFilePath = filePath;
          }
          // Only open if it's a different file and we haven't already opened it
          if (this.fileEditor) {
            const currentPath = this.fileEditor.selectedFilePath();
            if (currentPath !== decodedFilePath && !this.fileOpenedFromQuery) {
              this.fileOpenedFromQuery = false; // Reset flag for new file
              this.openFileWhenReady(decodedFilePath);
            }
          }
        } else if (!isFileOnlyMode) {
          // Reset flag when file query parameter is removed
          this.fileOpenedFromQuery = false;
        }
      });

    // Reset editor view when selected agent changes and load commands
    this.selectedAgent$.pipe(takeUntil(this.destroy$)).subscribe((agent) => {
      const currentAgentId = agent?.id || null;
      if (currentAgentId && currentAgentId !== this.previousAgentId && this.editorOpen()) {
        // Reset visibility when agent changes and editor is open (unless in file-only mode)
        if (!this.fileOnlyMode()) {
          this.chatVisible.set(true);
          if (this.fileEditor) {
            this.fileEditor.fileTreeVisible.set(true);
            this.fileEditor.terminalVisible.set(false);
          }
        } else {
          // Reset file opened flag when agent changes in file-only mode
          // This allows the file to be opened again for the new agent
          this.fileOpenedFromQuery = false;
          // Reset standalone loading state when switching agents
          this.standaloneFileLoaded = false;
          if (this.standaloneMode() && this.route.snapshot.queryParams['file']) {
            this.standaloneLoadingService.setLoading(true);
          }
          // Check if we still have a file query parameter and open it
          const filePath = this.route.snapshot.queryParams['file'];
          if (filePath) {
            // Decode the file path (in case it's URL encoded)
            let decodedFilePath: string;
            try {
              decodedFilePath = decodeURIComponent(filePath);
            } catch {
              decodedFilePath = filePath;
            }
            this.openFileWhenReady(decodedFilePath);
          }
        }
      }
      // Load commands when agent is selected
      if (currentAgentId && this.activeClientId) {
        this.filesFacade.listDirectory(this.activeClientId, currentAgentId, { path: '.cursor/commands' });
      }
      this.previousAgentId = currentAgentId;
    });

    // Load agents when active client changes
    this.activeClientId$.pipe(takeUntil(this.destroy$)).subscribe((clientId) => {
      if (clientId && clientId !== this.activeClientId) {
        // Switching to a different client - clear agent selection from previous client
        const previousClientId = this.activeClientId;
        if (previousClientId) {
          // Clear agent selection in facade for the previous client
          this.agentsFacade.clearSelectedClientAgent(previousClientId);
        }
        // Clear local agent selection
        this.selectedAgentId.set(null);
        // Update active client
        this.activeClientId = clientId;
        this.agentsFacade.loadClientAgents(clientId);
        // Ensure socket is connected before setting client
        this.ensureSocketConnectedAndSetClient(clientId);
      } else if (!clientId && this.activeClientId) {
        // Client was cleared, reset local state
        const previousClientId = this.activeClientId;
        this.activeClientId = null;
        // Clear agent selection for the previous client
        if (previousClientId) {
          this.agentsFacade.clearSelectedClientAgent(previousClientId);
        }
        // Also clear local selected agent if any
        const currentAgentId = this.selectedAgentId();
        if (currentAgentId) {
          this.selectedAgentId.set(null);
        }
      }
    });

    // Subscribe to chat messages and trigger scroll when new messages arrive
    this.chatMessages$.pipe(takeUntil(this.destroy$)).subscribe((messages) => {
      const currentMessageCount = messages.length;

      // Initialize lastAgentMessageTimestamp on first load to prevent treating existing messages as new
      if (this.previousMessageCount === 0 && currentMessageCount > 0 && this.lastAgentMessageTimestamp === 0) {
        const agentMessages = messages.filter((msg) => this.isAgentMessage(msg.payload));
        if (agentMessages.length > 0) {
          this.lastAgentMessageTimestamp = Math.max(...agentMessages.map((msg) => msg.timestamp));
        }
      }

      if (currentMessageCount > this.previousMessageCount) {
        this.shouldScrollToBottom = true;
        this.previousMessageCount = currentMessageCount;
        // Trigger change detection to ensure DOM is updated
        this.cdr.detectChanges();

        // Check for new agent messages and refresh editor if open
        const newAgentMessages = messages.filter(
          (msg) => this.isAgentMessage(msg.payload) && msg.timestamp > this.lastAgentMessageTimestamp,
        );
        if (newAgentMessages.length > 0) {
          // Update last agent message timestamp
          this.lastAgentMessageTimestamp = Math.max(
            ...newAgentMessages.map((msg) => msg.timestamp),
            this.lastAgentMessageTimestamp,
          );

          // Refresh file editor if it's open
          if (this.editorOpen() && this.fileEditor) {
            this.fileEditor.refresh();
          }
        }
      } else if (currentMessageCount < this.previousMessageCount) {
        // Messages were cleared (e.g., switching clients/agents)
        this.previousMessageCount = currentMessageCount;
        this.lastUserMessageTimestamp.set(null);
        this.lastAgentMessageTimestamp = 0;
      }
    });

    // Subscribe to waiting state changes to trigger scroll when loading indicator appears
    this.waitingForResponse$.pipe(takeUntil(this.destroy$)).subscribe((waiting) => {
      if (waiting) {
        // When we start waiting for a response, scroll to show the loading indicator
        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();
      }
    });

    // Preload marked library in the background
    this.loadMarked().catch(() => {
      // Silently fail - will use plain text fallback
    });

    // Watch for file content loading in standalone mode
    combineLatest([this.standaloneMode$, this.selectedAgent$, this.activeClientId$, this.route.queryParams])
      .pipe(
        filter(([standalone, agent, clientId]) => {
          // Show loading if standalone mode is active and we have agent/client
          // If no file is specified, we'll hide loading immediately
          return standalone && !!agent && !!clientId && !this.standaloneFileLoaded;
        }),
        switchMap(([, agent, clientId, queryParams]) => {
          // TypeScript guard: agent and clientId are checked in filter, but we need to assert here
          if (!agent || !clientId) {
            return of(false);
          }
          // At this point, TypeScript knows agent and clientId are non-null
          const nonNullAgent = agent;
          const nonNullClientId = clientId;

          const filePathParam = queryParams?.['file'];
          // If no file is specified, hide loading immediately
          if (!filePathParam || typeof filePathParam !== 'string') {
            return of(true); // Return true to indicate we can hide loading (no file to wait for)
          }
          const filePath: string = filePathParam;
          // Decode the file path
          const decodedFilePath: string = (() => {
            try {
              return decodeURIComponent(filePath);
            } catch {
              return filePath;
            }
          })();
          // Watch for file content to be loaded
          // Use combineLatest to watch both loading state and content
          return combineLatest([
            this.filesFacade.isReadingFile$(nonNullClientId, nonNullAgent.id, decodedFilePath),
            this.filesFacade.getFileContent$(nonNullClientId, nonNullAgent.id, decodedFilePath),
          ]).pipe(
            // Wait until file is not loading AND content is available
            filter(([isLoading, content]) => !isLoading && content !== null),
            take(1),
            map(() => true), // Just emit a value to indicate loading is complete
          );
        }),
        filter((result) => result === true), // Filter out false results
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        // File content is loaded (or no file to load), hide the loading spinner (only on initial load)
        if (!this.standaloneFileLoaded) {
          this.standaloneLoadingService.setLoading(false);
          this.standaloneFileLoaded = true;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Dispose tooltip if it exists
    if (this.shareButtonTooltip) {
      this.shareButtonTooltip.dispose();
      this.shareButtonTooltip = null;
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && this.chatMessagesContainer) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  onClientSelect(clientId: string, navigate = true): void {
    // Use local state for immediate check to avoid race conditions
    const currentActiveClientId = this.activeClientId;

    if (currentActiveClientId === clientId) {
      // Client is already selected, unselect it
      // First, unselect any selected agent (without navigation)
      const currentAgentId = this.selectedAgentId();
      if (currentAgentId && this.activeClientId) {
        this.onAgentUnselect(false);
      }
      // Clear active client
      this.clientsFacade.clearActiveClient();
      // Disconnect socket if connected
      this.socketConnected$.pipe(take(1)).subscribe((connected) => {
        if (connected) {
          this.socketsFacade.disconnect();
        }
      });
      // Navigate to base route
      if (navigate) {
        this.router.navigate(['/']);
      }
      // Reset message count
      this.previousMessageCount = 0;
      this.lastUserMessageTimestamp.set(null);
      // Close editor if open
      if (this.editorOpen()) {
        this.editorOpen.set(false);
      }
    } else {
      // Select the client
      // Clear agent selection from previous client if switching
      const previousClientId = this.activeClientId;
      if (previousClientId && previousClientId !== clientId) {
        // Clear agent selection in facade for the previous client
        this.agentsFacade.clearSelectedClientAgent(previousClientId);
        // Clear local agent selection
        this.selectedAgentId.set(null);
      }

      if (navigate) {
        this.router.navigate(['/clients', clientId]);
      }

      this.clientsFacade.setActiveClient(clientId);
      // Update local state and load agents immediately to avoid race conditions
      // This ensures agents are loaded even if the subscription doesn't fire due to timing
      if (this.activeClientId !== clientId) {
        this.activeClientId = clientId;
        this.agentsFacade.loadClientAgents(clientId);
        // Ensure socket is connected before setting client
        this.ensureSocketConnectedAndSetClient(clientId);
      }
      // Reset message count when switching clients
      this.previousMessageCount = 0;
      this.lastUserMessageTimestamp.set(null);
      // Reset file opened flag when switching clients
      this.fileOpenedFromQuery = false;
      // Reset standalone loading state when switching clients
      this.standaloneFileLoaded = false;
      if (this.standaloneMode() && this.route.snapshot.queryParams['file']) {
        this.standaloneLoadingService.setLoading(true);
      }
    }
  }

  onAgentSelect(agentId: string, navigate = true): void {
    // Check if this agent is already selected
    const currentAgentId = this.selectedAgentId();
    if (currentAgentId === agentId) {
      // Agent is already selected, unselect it
      this.onAgentUnselect();
    } else {
      // Select the agent
      if (navigate) {
        this.router.navigate(['/clients', this.activeClientId, 'agents', agentId]);
      }

      this.selectedAgentId.set(agentId);
      const clientId = this.activeClientId;
      if (clientId) {
        this.agentsFacade.loadClientAgent(clientId, agentId);
        // Load commands for the selected agent
        this.filesFacade.listDirectory(clientId, agentId, { path: '.cursor/commands' });
        // Reset message count when switching agents
        this.previousMessageCount = 0;
        this.lastUserMessageTimestamp.set(null);
        // Disconnect current socket, then connect and auto-login agent
        this.disconnectAndReconnectForAgent(clientId, agentId);
      }
    }
  }

  /**
   * Unselect the current agent and close the websocket if open
   * @param navigate - Whether to navigate to the client route (default: true)
   */
  private onAgentUnselect(navigate = true): void {
    const clientId = this.activeClientId;
    if (clientId) {
      // Clear selected agent in facade
      this.agentsFacade.clearSelectedClientAgent(clientId);
    }
    // Clear local selected agent ID
    this.selectedAgentId.set(null);
    // Disconnect socket if connected
    this.socketConnected$.pipe(take(1)).subscribe((connected) => {
      if (connected) {
        this.socketsFacade.disconnect();
      }
    });
    // Navigate to client route (without agent) if requested
    if (navigate) {
      this.router.navigate(['/clients', clientId]);
    }
    // Reset message count
    this.previousMessageCount = 0;
    this.lastUserMessageTimestamp.set(null);
    // Close editor if open
    if (this.editorOpen()) {
      this.editorOpen.set(false);
    }
  }

  onSendMessage(): void {
    let message = this.chatMessage().trim();

    // Append selected command to message if one is selected
    const selectedCmd = this.selectedCommand();
    if (selectedCmd) {
      message = message ? `${selectedCmd}\n${message}` : selectedCmd;
    }

    if (!message) {
      return;
    }

    const agentId = this.selectedAgentId();
    if (!agentId) {
      // Cannot send message without an agent selected
      return;
    }

    // agentId is required for routing the event to the correct agent
    this.socketsFacade.forwardChat(message, agentId, this.selectedChatModel());

    // Track when we sent the message to show loading indicator
    this.lastUserMessageTimestamp.set(Date.now());

    this.chatMessage.set('');
    // Clear selected command after sending
    this.selectedCommand.set(null);
    // Trigger scroll after sending message
    this.shouldScrollToBottom = true;
  }

  onChatInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.onSendMessage();
    }
  }

  onChatModelChange(value: string): void {
    const normalizedValue = value === '' ? null : value;
    this.selectedChatModel.set(normalizedValue);
    this.socketsFacade.setChatModel(normalizedValue);
  }

  onCommandChange(value: string): void {
    const normalizedValue = value === '' ? null : value;
    this.selectedCommand.set(normalizedValue);
  }

  onConnectSocket(): void {
    this.socketsFacade.connect();
  }

  onDisconnectSocket(): void {
    this.socketsFacade.disconnect();
  }

  onToggleEditor(navigate = true, openInNewWindow = false): void {
    const wasOpen = this.editorOpen();

    // If opening in new window and editor is not open, open new window
    if (openInNewWindow && !wasOpen) {
      this.openEditorInNewWindow();
      return;
    }

    this.editorOpen.update((open) => !open);

    if (navigate) {
      // Check if we're in file-only mode
      const filePath = this.route.snapshot.queryParams['file'];
      if (filePath && !wasOpen) {
        // Navigate with file query parameter
        this.router.navigate(['/clients', this.activeClientId, 'agents', this.selectedAgentId(), 'editor'], {
          queryParams: { file: filePath },
        });
      } else {
        this.router.navigate(
          wasOpen
            ? ['/clients', this.activeClientId, 'agents', this.selectedAgentId()]
            : ['/clients', this.activeClientId, 'agents', this.selectedAgentId(), 'editor'],
        );
      }
    }

    // Reset visibility when opening editor for a new agent (unless in file-only mode)
    if (!wasOpen && this.editorOpen() && !this.fileOnlyMode()) {
      this.chatVisible.set(true);
      if (this.fileEditor) {
        this.fileEditor.fileTreeVisible.set(true);
        this.fileEditor.terminalVisible.set(false);
        this.fileEditor.autosaveEnabled.set(false);
      }
    }
  }

  /**
   * Get whether to open editor in new window from environment configuration
   */
  getOpenInNewWindow(): boolean {
    return this.environment.editor?.openInNewWindow ?? false;
  }

  /**
   * Open editor in a new window with minimal browser controls in standalone mode
   */
  private openEditorInNewWindow(): void {
    const clientId = this.activeClientId;
    const agentId = this.selectedAgentId();
    if (!clientId || !agentId) {
      return;
    }

    // Get currently selected file path if editor is open and file is selected
    let filePath: string | undefined;
    if (this.fileEditor) {
      filePath = this.fileEditor.selectedFilePath() || undefined;
    }

    // Build the URL
    const baseUrl = window.location.origin;
    const editorPath = `/clients/${clientId}/agents/${agentId}/editor`;
    const queryParams = new URLSearchParams();
    queryParams.set('standalone', 'true');
    if (filePath) {
      queryParams.set('file', encodeURIComponent(filePath));
    }
    const url = `${baseUrl}${editorPath}?${queryParams.toString()}`;

    // Open new window with minimal controls and maximize if possible
    // Note: Modern browsers have restrictions on window features, but we try to minimize what's possible
    // Use screen dimensions to maximize the window
    const screenWidth = window.screen.availWidth || window.screen.width;
    const screenHeight = window.screen.availHeight || window.screen.height;

    const windowFeatures = [
      'menubar=no',
      'toolbar=no',
      'location=no', // Attempts to hide address bar (may be ignored by browsers)
      'status=no',
      'resizable=yes',
      'scrollbars=yes',
      `width=${screenWidth}`,
      `height=${screenHeight}`,
      `left=0`,
      `top=0`,
    ].join(',');

    const newWindow = window.open(url, '_blank', windowFeatures);

    // Try to maximize after window opens (may be blocked by browser security)
    if (newWindow) {
      // Use setTimeout to ensure window is fully loaded before attempting to maximize
      setTimeout(() => {
        try {
          newWindow.moveTo(0, 0);
          newWindow.resizeTo(screenWidth, screenHeight);
          // Try to maximize if the browser supports it
          if (newWindow.screen && 'availWidth' in newWindow.screen) {
            const availWidth = (newWindow.screen as Screen & { availWidth?: number }).availWidth;
            const availHeight = (newWindow.screen as Screen & { availHeight?: number }).availHeight;
            if (availWidth && availHeight) {
              newWindow.resizeTo(availWidth, availHeight);
            }
          }
        } catch (e) {
          // Browser may block window manipulation for security reasons
          console.warn('Could not maximize window:', e);
        }
      }, 100);
    }
  }

  onToggleChat(): void {
    this.chatVisible.update((visible) => !visible);
    // Recalculate file editor tabs when chat visibility changes
    if (this.fileEditor) {
      this.fileEditor.recalculateTabs();
    }
  }

  /**
   * Share the currently selected file link by copying it to clipboard
   */
  onShareFileLink(): void {
    const filePath = this.fileEditor?.selectedFilePath();
    const clientId = this.activeClientId;
    const agentId = this.selectedAgentId();

    if (!filePath || !clientId || !agentId) {
      return;
    }

    // Build the URL
    const baseUrl = window.location.origin;
    const editorPath = `/clients/${clientId}/agents/${agentId}/editor`;
    const queryParams = new URLSearchParams();
    queryParams.set('standalone', 'true');
    queryParams.set('file', encodeURIComponent(filePath));
    const url = `${baseUrl}${editorPath}?${queryParams.toString()}`;

    // Copy to clipboard
    navigator.clipboard
      .writeText(url)
      .then(() => {
        console.log('File link copied to clipboard:', url);
        this.showShareTooltip('Link copied');
      })
      .catch((err) => {
        console.error('Failed to copy file link to clipboard:', err);
        // Fallback: try using the older clipboard API
        const success = this.fallbackCopyToClipboard(url);
        if (success) {
          this.showShareTooltip('Link copied');
        }
      });
  }

  /**
   * Show tooltip with message and hide it after a couple seconds.
   * Temporarily disables hover trigger to prevent tooltip from appearing on hover after click.
   */
  private showShareTooltip(message: string): void {
    if (!this.shareFileLinkButton?.nativeElement) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bootstrap = (window as any).bootstrap;
    if (!bootstrap?.Tooltip) {
      console.warn('Bootstrap Tooltip not available');
      return;
    }

    // Store original values
    const originalTitle = this.shareFileLinkButton.nativeElement.getAttribute('title') || 'Share file link';
    const originalTrigger = this.shareFileLinkButton.nativeElement.getAttribute('data-bs-trigger') || 'hover focus';

    // Dispose existing tooltip if it exists
    if (this.shareButtonTooltip) {
      try {
        this.shareButtonTooltip.dispose();
      } catch (e) {
        // Tooltip might already be disposed
      }
    }

    // Temporarily change trigger to 'manual' to prevent hover from showing tooltip
    this.shareFileLinkButton.nativeElement.setAttribute('data-bs-trigger', 'manual');
    this.shareFileLinkButton.nativeElement.setAttribute('title', message);
    this.shareFileLinkButton.nativeElement.setAttribute('data-bs-original-title', message);

    // Create new tooltip instance with manual trigger
    this.shareButtonTooltip = new bootstrap.Tooltip(this.shareFileLinkButton.nativeElement, {
      trigger: 'manual',
      title: message,
      placement: 'bottom',
    });

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      if (this.shareButtonTooltip) {
        this.shareButtonTooltip.show();
      }
    }, 0);

    // Hide tooltip after 2 seconds and restore hover behavior
    setTimeout(() => {
      if (this.shareButtonTooltip && this.shareFileLinkButton?.nativeElement) {
        this.shareButtonTooltip.hide();

        // Restore original title
        this.shareFileLinkButton.nativeElement.setAttribute('title', originalTitle);
        this.shareFileLinkButton.nativeElement.setAttribute('data-bs-original-title', originalTitle);

        // Restore original trigger after a short delay to ensure tooltip is fully hidden
        setTimeout(() => {
          if (this.shareFileLinkButton?.nativeElement) {
            // Dispose current tooltip
            if (this.shareButtonTooltip) {
              try {
                this.shareButtonTooltip.dispose();
              } catch (e) {
                // Tooltip might already be disposed
              }
              this.shareButtonTooltip = null;
            }

            // Restore original trigger
            this.shareFileLinkButton.nativeElement.setAttribute('data-bs-trigger', originalTrigger);

            // Recreate tooltip with original trigger for hover behavior
            this.shareButtonTooltip = new bootstrap.Tooltip(this.shareFileLinkButton.nativeElement, {
              trigger: originalTrigger,
              title: originalTitle,
              placement: 'bottom',
            });
          }
        }, 100);
      }
    }, 2000);
  }

  /**
   * Fallback method to copy text to clipboard for older browsers
   * Returns true if successful, false otherwise
   */
  private fallbackCopyToClipboard(text: string): boolean {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('File link copied to clipboard (fallback):', text);
        return true;
      } else {
        console.error('Fallback copy command failed');
        return false;
      }
    } catch (err) {
      console.error('Fallback copy to clipboard failed:', err);
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }

  onDeleteClientClick(clientId: string, clientName: string): void {
    this.clientToDeleteId.set(clientId);
    this.clientToDeleteName.set(clientName);
    this.showModal(this.deleteClientModal);
  }

  onDeleteAgentClick(agentId: string, agentName: string): void {
    this.agentToDeleteId.set(agentId);
    this.agentToDeleteName.set(agentName);
    this.showModal(this.deleteAgentModal);
  }

  confirmDeleteClient(): void {
    const clientId = this.clientToDeleteId();
    if (clientId) {
      this.clientsFacade.deleteClient(clientId);
      // Subscribe to deletion completion (success or failure) to close modal
      this.clientsDeleting$
        .pipe(
          filter((deleting) => !deleting),
          take(1),
          takeUntil(this.destroy$),
        )
        .subscribe(() => {
          this.hideModal(this.deleteClientModal);
          this.clientToDeleteId.set(null);
          this.clientToDeleteName.set('');
        });
    }
  }

  confirmDeleteAgent(): void {
    const agentId = this.agentToDeleteId();
    const clientId = this.activeClientId;
    if (agentId && clientId) {
      this.agentsFacade.deleteClientAgent(clientId, agentId);
      // Subscribe to deletion completion (success or failure) to close modal
      this.agentsDeleting$
        .pipe(
          filter((deleting) => !deleting),
          take(1),
          takeUntil(this.destroy$),
        )
        .subscribe(() => {
          this.hideModal(this.deleteAgentModal);
          this.agentToDeleteId.set(null);
          this.agentToDeleteName.set('');
        });
    }
  }

  /**
   * Show a Bootstrap modal
   */
  private showModal(modalElement: ElementRef<HTMLDivElement>): void {
    if (modalElement?.nativeElement) {
      // Use Bootstrap 5 Modal API
      const modal = (window as any).bootstrap?.Modal?.getOrCreateInstance(modalElement.nativeElement);
      if (modal) {
        modal.show();
      } else {
        // Fallback: create new modal instance
        const Modal = (window as any).bootstrap?.Modal;
        if (Modal) {
          new Modal(modalElement.nativeElement).show();
        }
      }
    }
  }

  /**
   * Hide a Bootstrap modal
   */
  private hideModal(modalElement: ElementRef<HTMLDivElement>): void {
    if (modalElement?.nativeElement) {
      const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement.nativeElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  onAddClientClick(): void {
    // Reset form
    this.newClient.set({
      name: '',
      description: '',
      endpoint: '',
      authenticationType: undefined,
      apiKey: undefined,
      keycloakClientId: undefined,
      keycloakClientSecret: undefined,
      keycloakRealm: undefined,
      agentWsPort: undefined,
    });
    this.showModal(this.addClientModal);
  }

  onAddAgentClick(): void {
    // Reset form
    this.newAgent.set({
      name: '',
      description: '',
    });
    this.showModal(this.addAgentModal);
  }

  onClientAuthTypeChange(): void {
    // Clear authentication-specific fields when type changes
    const current = this.newClient();
    this.newClient.set({
      ...current,
      apiKey: undefined,
      keycloakClientId: undefined,
      keycloakClientSecret: undefined,
      keycloakRealm: undefined,
    });
  }

  onSubmitAddClient(): void {
    const clientData = this.newClient();
    if (!clientData.name || !clientData.endpoint || !clientData.authenticationType) {
      return;
    }

    // Build the DTO, only including defined values
    const createDto: CreateClientDto = {
      name: clientData.name,
      endpoint: clientData.endpoint,
      authenticationType: clientData.authenticationType,
    };

    if (clientData.description) {
      createDto.description = clientData.description;
    }

    if (clientData.authenticationType === 'api_key' && clientData.apiKey) {
      createDto.apiKey = clientData.apiKey;
    }

    if (clientData.authenticationType === 'keycloak') {
      if (clientData.keycloakClientId) {
        createDto.keycloakClientId = clientData.keycloakClientId;
      }
      if (clientData.keycloakClientSecret) {
        createDto.keycloakClientSecret = clientData.keycloakClientSecret;
      }
      if (clientData.keycloakRealm) {
        createDto.keycloakRealm = clientData.keycloakRealm;
      }
    }

    if (clientData.agentWsPort) {
      createDto.agentWsPort = clientData.agentWsPort;
    }

    this.clientsFacade.createClient(createDto);

    // Subscribe to creation completion to close modal
    this.clientsCreating$
      .pipe(
        filter((creating) => !creating),
        take(1),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.hideModal(this.addClientModal);
        // Reset form
        this.newClient.set({
          name: '',
          description: '',
          endpoint: '',
          authenticationType: undefined,
          apiKey: undefined,
          keycloakClientId: undefined,
          keycloakClientSecret: undefined,
          keycloakRealm: undefined,
          agentWsPort: undefined,
        });
      });
  }

  onSubmitAddAgent(): void {
    const agentData = this.newAgent();
    const clientId = this.activeClientId;

    if (!agentData.name || !clientId) {
      return;
    }

    // Build the DTO
    const createDto: CreateAgentDto = {
      name: agentData.name,
    };

    if (agentData.description) {
      createDto.description = agentData.description;
    }

    this.agentsFacade.createClientAgent(clientId, createDto);

    // Subscribe to creation completion to close modal
    this.agentsCreating$
      .pipe(
        filter((creating) => !creating),
        take(1),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.hideModal(this.addAgentModal);
        // Reset form
        this.newAgent.set({
          name: '',
          description: '',
          agentType: undefined,
        });
      });
  }

  // Helper methods to update signal values for form binding
  updateClientField<K extends keyof CreateClientDto>(field: K, value: CreateClientDto[K]): void {
    this.newClient.update((current) => ({ ...current, [field]: value }));
  }

  updateClientFieldNumber(field: 'agentWsPort', value: string | number | null | undefined): void {
    const numValue = value === '' || value === null || value === undefined ? undefined : Number(value);
    this.newClient.update((current) => ({ ...current, [field]: numValue }));
  }

  updateAgentField<K extends keyof CreateAgentDto>(field: K, value: CreateAgentDto[K]): void {
    this.newAgent.update((current) => ({ ...current, [field]: value }));
  }

  // Helper methods to update editing signal values for form binding
  updateEditingClientField<K extends keyof UpdateClientDto>(field: K, value: UpdateClientDto[K]): void {
    this.editingClient.update((current) => ({ ...current, [field]: value }));
  }

  updateEditingClientFieldNumber(field: 'agentWsPort', value: string | number | null | undefined): void {
    const numValue = value === '' || value === null || value === undefined ? undefined : Number(value);
    this.editingClient.update((current) => ({ ...current, [field]: numValue }));
  }

  updateEditingAgentField<K extends keyof UpdateAgentDto>(field: K, value: UpdateAgentDto[K]): void {
    this.editingAgent.update((current) => ({ ...current, [field]: value }));
  }

  onEditClientClick(client: ClientResponseDto): void {
    // Pre-fill form with current client values
    this.editingClientId.set(client.id);
    this.editingClient.set({
      name: client.name,
      description: client.description,
      endpoint: client.endpoint,
      authenticationType: client.authenticationType,
      // Note: API key and secrets are not returned in ClientResponseDto for security
      // They will be undefined, and user can optionally set new values
      apiKey: undefined,
      keycloakClientId: undefined,
      keycloakClientSecret: undefined,
      keycloakRealm: undefined,
      agentWsPort: client.agentWsPort,
    });
    this.showModal(this.updateClientModal);
  }

  onEditAgentClick(agent: AgentResponseDto): void {
    // Pre-fill form with current agent values
    this.editingAgentId.set(agent.id);
    this.editingAgent.set({
      name: agent.name,
      description: agent.description,
    });
    this.showModal(this.updateAgentModal);
  }

  onEditingClientAuthTypeChange(): void {
    // Clear authentication-specific fields when type changes
    const current = this.editingClient();
    this.editingClient.set({
      ...current,
      apiKey: undefined,
      keycloakClientId: undefined,
      keycloakClientSecret: undefined,
      keycloakRealm: undefined,
    });
  }

  onSubmitUpdateClient(): void {
    const clientId = this.editingClientId();
    const clientData = this.editingClient();
    if (!clientId || !clientData.name || !clientData.endpoint || !clientData.authenticationType) {
      return;
    }

    // Build the DTO, only including defined values
    const updateDto: UpdateClientDto = {};

    if (clientData.name) {
      updateDto.name = clientData.name;
    }
    if (clientData.description !== undefined) {
      updateDto.description = clientData.description;
    }
    if (clientData.endpoint) {
      updateDto.endpoint = clientData.endpoint;
    }
    if (clientData.authenticationType) {
      updateDto.authenticationType = clientData.authenticationType;
    }

    if (clientData.authenticationType === 'api_key' && clientData.apiKey !== undefined) {
      updateDto.apiKey = clientData.apiKey;
    }

    if (clientData.authenticationType === 'keycloak') {
      if (clientData.keycloakClientId !== undefined) {
        updateDto.keycloakClientId = clientData.keycloakClientId;
      }
      if (clientData.keycloakClientSecret !== undefined) {
        updateDto.keycloakClientSecret = clientData.keycloakClientSecret;
      }
      if (clientData.keycloakRealm !== undefined) {
        updateDto.keycloakRealm = clientData.keycloakRealm;
      }
    }

    if (clientData.agentWsPort !== undefined) {
      updateDto.agentWsPort = clientData.agentWsPort;
    }

    this.clientsFacade.updateClient(clientId, updateDto);

    // Subscribe to update completion to close modal
    this.clientsUpdating$
      .pipe(
        filter((updating) => !updating),
        take(1),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.hideModal(this.updateClientModal);
        // Reset form
        this.editingClientId.set(null);
        this.editingClient.set({
          name: '',
          description: '',
          endpoint: '',
          authenticationType: undefined,
          apiKey: undefined,
          keycloakClientId: undefined,
          keycloakClientSecret: undefined,
          keycloakRealm: undefined,
          agentWsPort: undefined,
        });
      });
  }

  onSubmitUpdateAgent(): void {
    const agentId = this.editingAgentId();
    const agentData = this.editingAgent();
    const clientId = this.activeClientId;

    if (!agentId || !agentData.name || !clientId) {
      return;
    }

    // Build the DTO
    const updateDto: UpdateAgentDto = {};

    if (agentData.name) {
      updateDto.name = agentData.name;
    }
    if (agentData.description !== undefined) {
      updateDto.description = agentData.description;
    }

    this.agentsFacade.updateClientAgent(clientId, agentId, updateDto);

    // Subscribe to update completion to close modal
    this.agentsUpdating$
      .pipe(
        filter((updating) => !updating),
        take(1),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.hideModal(this.updateAgentModal);
        // Reset form
        this.editingAgentId.set(null);
        this.editingAgent.set({
          name: '',
          description: '',
        });
      });
  }

  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  /**
   * Extract hostname and port from a URL string
   * @param url - The full URL string
   * @returns The hostname with port if present (e.g., "example.com:8080") or just hostname if no port, or the original string if parsing fails
   */
  getHostname(url: string): string {
    try {
      const urlObj = new URL(url);
      // Return hostname with port if port is explicitly specified in the URL
      if (urlObj.port) {
        return `${urlObj.hostname}:${urlObj.port}`;
      }
      return urlObj.hostname;
    } catch {
      // If URL parsing fails, return the original string
      return url;
    }
  }

  /**
   * Get the display name for an agent type from a client's config.
   * @param agentType - The agent type identifier (e.g., 'cursor')
   * @param client - The client response DTO (optional, will use active client if not provided)
   * @returns The display name (e.g., 'Cursor') or the type itself if not found
   */
  getAgentTypeDisplayName(agentType: string | undefined, client?: ClientResponseDto | null): string {
    if (!agentType) {
      return '';
    }
    const clientToUse = client;
    const agentTypeInfo = clientToUse?.config?.agentTypes?.find((at) => at.type === agentType);
    return agentTypeInfo?.displayName || agentType;
  }

  /**
   * Parse git repository URL to extract owner/repo
   * @param gitUrl - The git repository URL (e.g., "https://github.com/owner/repo.git" or "git@github.com:owner/repo.git")
   * @returns The owner/repo string (e.g., "owner/repo") or null if parsing fails
   */
  parseGitRepository(gitUrl: string | null | undefined): string | null {
    if (!gitUrl) {
      return null;
    }

    try {
      // Handle HTTPS/HTTP URLs: https://github.com/owner/repo.git
      if (gitUrl.startsWith('http://') || gitUrl.startsWith('https://')) {
        const urlObj = new URL(gitUrl);
        const pathParts = urlObj.pathname.split('/').filter((part) => part.length > 0);
        if (pathParts.length >= 2) {
          const owner = pathParts[0];
          const repo = pathParts[1].replace(/\.git$/, '');
          return `${owner}/${repo}`;
        }
      }

      // Handle SSH URLs: git@github.com:owner/repo.git
      if (gitUrl.startsWith('git@')) {
        const match = gitUrl.match(/git@[^:]+:(.+?)(?:\.git)?$/);
        if (match && match[1]) {
          return match[1];
        }
      }

      // Fallback: try to extract from any URL pattern
      const match = gitUrl.match(/(?:[/:])([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (match && match[1] && match[2]) {
        return `${match[1]}/${match[2]}`;
      }

      return null;
    } catch {
      return null;
    }
  }

  isUserMessage(payload: ForwardedEventPayload): boolean {
    if ('success' in payload && payload.success && 'data' in payload) {
      const data = payload.data as ChatMessageData;
      return 'from' in data && data.from === 'user';
    }
    return false;
  }

  isAgentMessage(payload: ForwardedEventPayload): boolean {
    if ('success' in payload && payload.success && 'data' in payload) {
      const data = payload.data as ChatMessageData;
      return 'from' in data && data.from === 'agent';
    }
    return false;
  }

  getChatMessageData(payload: ForwardedEventPayload): ChatMessageData | null {
    if ('success' in payload && payload.success && 'data' in payload) {
      return payload.data as ChatMessageData;
    }
    return null;
  }

  hasResponse(messageData: ChatMessageData): boolean {
    return 'response' in messageData;
  }

  isResponseString(messageData: ChatMessageData): boolean {
    return 'response' in messageData && typeof messageData.response === 'string';
  }

  getResponse(messageData: ChatMessageData): string | unknown {
    if ('response' in messageData) {
      return messageData.response;
    }
    return null;
  }

  getResult(messageData: ChatMessageData): string | null {
    if ('response' in messageData) {
      const response = messageData.response;
      // If response is an object with a result property, return it
      if (typeof response === 'object' && response !== null && 'result' in response) {
        const result = response.result;
        return typeof result === 'string' ? result : String(result);
      }
      // If response is a string, return it as-is
      if (typeof response === 'string') {
        return response;
      }
    }
    return null;
  }

  /**
   * Load marked library asynchronously and cache the instance
   */
  private async loadMarked(): Promise<Marked> {
    if (this.markedInstance) {
      return this.markedInstance;
    }

    if (this.markedLoadPromise) {
      return this.markedLoadPromise;
    }

    this.markedLoadPromise = (async () => {
      try {
        const markedModule = await import('marked');
        // marked exports the parser directly
        const marked = markedModule.marked;
        this.markedInstance = marked;
        return marked;
      } catch (error) {
        this.markedLoadPromise = null;
        throw error;
      }
    })();

    return this.markedLoadPromise;
  }

  /**
   * Parse markdown to HTML and sanitize it
   */
  parseMarkdown(messageData: ChatMessageData): SafeHtml | null {
    const result = this.getResult(messageData);
    if (!result) {
      return null;
    }

    // If marked is already loaded, use it synchronously
    if (this.markedInstance) {
      try {
        const html = this.markedInstance.parse(result, {
          breaks: true, // Convert line breaks to <br>
          gfm: true, // GitHub Flavored Markdown
        });
        // Sanitize the HTML to prevent XSS attacks
        const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, html);
        return this.sanitizer.bypassSecurityTrustHtml(sanitized || '');
      } catch (error) {
        console.warn('Error parsing markdown:', error);
        const escaped = result.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return this.sanitizer.bypassSecurityTrustHtml(escaped);
      }
    }

    // If marked is not loaded yet, try to load it and parse
    // This will happen on first call
    this.loadMarked()
      .then(() => {
        // Trigger change detection to update the view with parsed markdown
        this.cdr.detectChanges();
      })
      .catch(() => {
        // Marked not available, will fall through to escaped text
      });

    // Return escaped text as fallback while marked is loading
    const escaped = result.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return this.sanitizer.bypassSecurityTrustHtml(escaped);
  }

  getText(messageData: ChatMessageData): string | null {
    if ('text' in messageData) {
      return messageData.text;
    }
    return null;
  }

  /**
   * Format message text with command badge if message starts with a slash command
   * @param text - The message text
   * @returns SafeHtml with command wrapped in badge if applicable
   */
  formatMessageWithCommandBadge(text: string | null): SafeHtml | null {
    if (!text) {
      return null;
    }

    // Check if message starts with a slash command
    const commandMatch = text.match(/^(\/[^\s\n]+)(.*)$/s);
    if (commandMatch) {
      const command = commandMatch[1];
      const restOfMessage = commandMatch[2];

      // Escape HTML in the rest of the message
      const escapedRest = restOfMessage
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br>');

      // Create HTML with badge (white background with primary text for user messages)
      const html = `<span class="badge bg-white text-primary me-2">${command}</span>${escapedRest}`;
      return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    // No command, return escaped text
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(escaped);
  }

  /**
   * Scroll chat messages container to the bottom
   */
  private scrollToBottom(): void {
    if (this.chatMessagesContainer?.nativeElement) {
      const element = this.chatMessagesContainer.nativeElement;
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight;
      });
    }
  }

  /**
   * Ensure socket is connected, then set the client
   * @param clientId - The client UUID
   */
  private ensureSocketConnectedAndSetClient(clientId: string): void {
    // Check if socket is already connected
    this.socketConnected$
      .pipe(
        take(1),
        switchMap((connected) => {
          if (connected) {
            // Already connected, set client immediately
            this.socketsFacade.setClient(clientId);
            return of(null);
          } else {
            // Not connected, connect first then set client
            this.socketsFacade.connect();
            return this.socketConnected$.pipe(
              filter((connected) => connected === true),
              take(1),
              tap(() => {
                this.socketsFacade.setClient(clientId);
              }),
            );
          }
        }),
      )
      .subscribe();
  }

  /**
   * Open a file when the file editor is ready
   * @param filePath - The file path to open
   */
  private openFileWhenReady(filePath: string): void {
    if (this.fileOpenedFromQuery) {
      // Already opened this file, skip
      return;
    }

    // Wait for agent to be selected and editor to be open
    this.selectedAgent$
      .pipe(
        filter((agent) => !!agent && this.editorOpen()),
        take(1),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        // Use multiple requestAnimationFrame calls and setTimeout to ensure file editor is fully initialized
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (this.fileEditor && !this.fileOpenedFromQuery) {
                // Check if file is already selected to avoid unnecessary reloads
                const currentPath = this.fileEditor.selectedFilePath();
                if (currentPath !== filePath) {
                  this.fileEditor.onFileSelect(filePath);
                  this.fileOpenedFromQuery = true;
                } else {
                  this.fileOpenedFromQuery = true;
                }
              }
            }, 200);
          });
        });
      });
  }

  /**
   * Disconnect current socket, reconnect, then set client and forward login
   * @param clientId - The client UUID
   * @param agentId - The agent UUID
   */
  private disconnectAndReconnectForAgent(clientId: string, agentId: string): void {
    // Check current connection state and handle disconnect/reconnect
    this.socketConnected$
      .pipe(
        take(1),
        switchMap((connected) => {
          if (connected) {
            // Currently connected, disconnect first
            this.socketsFacade.disconnect();
            // Wait for disconnection to complete (connected becomes false)
            return this.socketConnected$.pipe(
              filter((connected) => connected === false),
              take(1),
              switchMap(() => {
                // Now connect
                this.socketsFacade.connect();
                // Wait for connection to be established
                return this.socketConnected$.pipe(
                  filter((connected) => connected === true),
                  take(1),
                );
              }),
            );
          } else {
            // Not connected, just connect
            this.socketsFacade.connect();
            // Wait for connection to be established
            return this.socketConnected$.pipe(
              filter((connected) => connected === true),
              take(1),
            );
          }
        }),
        switchMap(() => {
          // Socket is now connected, set client
          this.socketsFacade.setClient(clientId);
          // Wait for setClientSuccess (indicated by selectedClientId matching clientId)
          return this.selectedClientId$.pipe(
            filter((selectedClientId) => selectedClientId === clientId),
            take(1),
          );
        }),
        tap(() => {
          // setClientSuccess received, now forward login
          this.socketsFacade.forwardLogin(agentId);
        }),
      )
      .subscribe();
  }
}
