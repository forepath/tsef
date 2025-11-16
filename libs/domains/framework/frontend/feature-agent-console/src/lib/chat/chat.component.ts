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
import { RouterModule } from '@angular/router';
import {
  AgentsFacade,
  ClientsFacade,
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
import { combineLatest, filter, map, Observable, of, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { FileEditorComponent } from '../file-editor/file-editor.component';

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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);

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

  // Socket observables
  readonly socketConnected$: Observable<boolean> = this.socketsFacade.connected$;
  readonly socketConnecting$: Observable<boolean> = this.socketsFacade.connecting$;
  readonly socketDisconnecting$: Observable<boolean> = this.socketsFacade.disconnecting$;
  readonly selectedClientId$: Observable<string | null> = this.socketsFacade.selectedClientId$;
  readonly chatMessages$ = this.socketsFacade.getForwardedEventsByEvent$('chatMessage');
  readonly forwarding$: Observable<boolean> = this.socketsFacade.forwarding$;
  readonly socketError$: Observable<string | null> = this.socketsFacade.error$;

  // Local state
  chatMessage = signal<string>('');
  selectedAgentId = signal<string | null>(null);
  editorOpen = signal<boolean>(false);
  chatVisible = signal<boolean>(true);
  private previousAgentId: string | null = null;

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
  readonly waitingForResponse$ = combineLatest([this.forwarding$, this.chatMessages$, this.socketError$]).pipe(
    map(([forwarding, messages, error]) => {
      const lastUserMsgTimestamp = this.lastUserMessageTimestamp();
      if (!lastUserMsgTimestamp) {
        return forwarding;
      }

      // Check if there's an agent message after the last user message
      const hasAgentResponse = messages.some(
        (msg) => msg.timestamp > lastUserMsgTimestamp && this.isAgentMessage(msg.payload),
      );

      // If we have an agent response or an error occurred, we're no longer waiting
      if (hasAgentResponse || (error && !forwarding)) {
        this.lastUserMessageTimestamp.set(null);
        return false;
      }

      // We're waiting if forwarding is true or if we sent a message but haven't received a response yet
      return forwarding || lastUserMsgTimestamp !== null;
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

  ngOnInit(): void {
    // Load clients on init
    this.clientsFacade.loadClients();

    // Reset editor view when selected agent changes
    this.selectedAgent$.pipe(takeUntil(this.destroy$)).subscribe((agent) => {
      const currentAgentId = agent?.id || null;
      if (currentAgentId && currentAgentId !== this.previousAgentId && this.editorOpen()) {
        // Reset visibility when agent changes and editor is open
        this.chatVisible.set(true);
        if (this.fileEditor) {
          this.fileEditor.fileTreeVisible.set(true);
        }
      }
      this.previousAgentId = currentAgentId;
    });

    // Load agents when active client changes
    this.activeClientId$.pipe(takeUntil(this.destroy$)).subscribe((clientId) => {
      if (clientId && clientId !== this.activeClientId) {
        this.activeClientId = clientId;
        this.agentsFacade.loadClientAgents(clientId);
        // Ensure socket is connected before setting client
        this.ensureSocketConnectedAndSetClient(clientId);
      }
    });

    // Subscribe to chat messages and trigger scroll when new messages arrive
    this.chatMessages$.pipe(takeUntil(this.destroy$)).subscribe((messages) => {
      const currentMessageCount = messages.length;
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && this.chatMessagesContainer) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  onClientSelect(clientId: string): void {
    this.clientsFacade.setActiveClient(clientId);
    // Reset message count when switching clients
    this.previousMessageCount = 0;
    this.lastUserMessageTimestamp.set(null);
  }

  onAgentSelect(agentId: string): void {
    this.selectedAgentId.set(agentId);
    const clientId = this.activeClientId;
    if (clientId) {
      this.agentsFacade.loadClientAgent(clientId, agentId);
      // Reset message count when switching agents
      this.previousMessageCount = 0;
      this.lastUserMessageTimestamp.set(null);
      // Disconnect current socket, then connect and auto-login agent
      this.disconnectAndReconnectForAgent(clientId, agentId);
    }
  }

  onSendMessage(): void {
    const message = this.chatMessage().trim();
    if (!message) {
      return;
    }

    const agentId = this.selectedAgentId();
    if (!agentId) {
      // Cannot send message without an agent selected
      return;
    }

    // agentId is required for routing the event to the correct agent
    this.socketsFacade.forwardChat(message, agentId);

    // Track when we sent the message to show loading indicator
    this.lastUserMessageTimestamp.set(Date.now());

    this.chatMessage.set('');
    // Trigger scroll after sending message
    this.shouldScrollToBottom = true;
  }

  onConnectSocket(): void {
    this.socketsFacade.connect();
  }

  onDisconnectSocket(): void {
    this.socketsFacade.disconnect();
  }

  onToggleEditor(): void {
    const wasOpen = this.editorOpen();
    this.editorOpen.update((open) => !open);

    // Reset visibility when opening editor for a new agent
    if (!wasOpen && this.editorOpen()) {
      this.chatVisible.set(true);
      if (this.fileEditor) {
        this.fileEditor.fileTreeVisible.set(true);
        this.fileEditor.autosaveEnabled.set(false);
      }
    }
  }

  onToggleChat(): void {
    this.chatVisible.update((visible) => !visible);
    // Recalculate file editor tabs when chat visibility changes
    if (this.fileEditor) {
      this.fileEditor.recalculateTabs();
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
