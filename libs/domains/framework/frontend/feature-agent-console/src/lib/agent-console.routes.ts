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
  deleteClient$,
  deleteClientAgent$,
  disconnectSocket$,
  loadClient$,
  loadClientAgent$,
  loadClientAgents$,
  loadClients$,
  login$,
  loginSuccessRedirect$,
  logout$,
  logoutSuccessRedirect$,
  setActiveClient$,
  SocketsFacade,
  socketsReducer,
  updateClient$,
  updateClientAgent$,
} from '@forepath/framework/frontend/data-access-agent-console';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
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
        redirectTo: 'dashboard',
      },
      {
        path: 'login',
        component: AgentConsoleLoginComponent,
        canActivate: [loginGuard],
      },
      {
        path: 'dashboard',
        component: AgentConsoleChatComponent,
        canActivate: [authGuard],
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
    providers: [
      // Facades
      AgentsFacade,
      ClientsFacade,
      SocketsFacade,
      // Feature states - registered at feature level for lazy loading
      provideState('clients', clientsReducer),
      provideState('agents', agentsReducer),
      provideState('sockets', socketsReducer),
      provideState('authentication', authenticationReducer),
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
      }),
    ],
  },
];
