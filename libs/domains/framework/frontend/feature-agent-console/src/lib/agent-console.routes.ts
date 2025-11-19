import { Route } from '@angular/router';
import {
  AgentsFacade,
  agentsReducer,
  authenticationReducer,
  checkAuthentication$,
  ClientsFacade,
  clientsReducer,
  connectSocket$,
  createClient$,
  createClientAgent$,
  createFileOrDirectory$,
  deleteClient$,
  deleteClientAgent$,
  deleteFileOrDirectory$,
  disconnectSocket$,
  FilesFacade,
  filesReducer,
  listDirectory$,
  loadClient$,
  loadClientAgent$,
  loadClientAgentCommandsFromFiles$,
  loadClientAgentCommandsLoading$,
  loadClientAgents$,
  loadClients$,
  login$,
  loginSuccessRedirect$,
  logout$,
  logoutSuccessRedirect$,
  moveFileOrDirectory$,
  readFile$,
  setActiveClient$,
  SocketsFacade,
  socketsReducer,
  updateClient$,
  updateClientAgent$,
  writeFile$,
} from '@forepath/framework/frontend/data-access-agent-console';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { provideMonacoEditor } from 'ngx-monaco-editor-v2';
import { AgentConsoleChatComponent } from './chat/chat.component';
import { AgentConsoleContainerComponent } from './container/container.component';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
import { AgentConsoleLoginComponent } from './login/login.component';

export const agentConsoleRoutes: Route[] = [
  {
    path: '',
    component: AgentConsoleContainerComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'clients',
      },
      {
        path: 'login',
        component: AgentConsoleLoginComponent,
        canActivate: [loginGuard],
        title: 'Login | Agenstra',
      },
      {
        path: 'clients',
        canActivate: [authGuard],
        title: 'Manager | Agenstra',
        children: [
          {
            path: '',
            component: AgentConsoleChatComponent,
            pathMatch: 'full',
          },
          {
            path: ':clientId',
            component: AgentConsoleChatComponent,
            pathMatch: 'full',
          },
          {
            path: ':clientId/agents/:agentId',
            component: AgentConsoleChatComponent,
            pathMatch: 'full',
          },
          {
            path: ':clientId/agents/:agentId/editor',
            component: AgentConsoleChatComponent,
            pathMatch: 'full',
          },
        ],
      },
      {
        path: '**',
        redirectTo: 'clients',
      },
    ],
    providers: [
      // Facades
      AgentsFacade,
      ClientsFacade,
      SocketsFacade,
      FilesFacade,
      // Feature states - registered at feature level for lazy loading
      provideState('clients', clientsReducer),
      provideState('agents', agentsReducer),
      provideState('sockets', socketsReducer),
      provideState('authentication', authenticationReducer),
      provideState('files', filesReducer),
      // Effects - only active when this feature route is loaded
      provideEffects({
        loadClients$,
        loadClient$,
        createClient$,
        updateClient$,
        deleteClient$,
        setActiveClient$,
        loadClientAgents$,
        loadClientAgent$,
        loadClientAgentCommandsLoading$,
        loadClientAgentCommandsFromFiles$,
        createClientAgent$,
        updateClientAgent$,
        deleteClientAgent$,
        connectSocket$,
        disconnectSocket$,
        login$,
        loginSuccessRedirect$,
        logout$,
        logoutSuccessRedirect$,
        checkAuthentication$,
        readFile$,
        writeFile$,
        listDirectory$,
        createFileOrDirectory$,
        deleteFileOrDirectory$,
        moveFileOrDirectory$,
      }),
      provideMonacoEditor(),
    ],
  },
];
