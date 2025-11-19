import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { of, throwError } from 'rxjs';
import { AgentsService } from '../../services/agents.service';
import { listDirectory, listDirectoryFailure, listDirectorySuccess } from '../files/files.actions';
import type { FileNodeDto } from '../files/files.types';
import {
  createClientAgent,
  createClientAgentFailure,
  createClientAgentSuccess,
  deleteClientAgent,
  deleteClientAgentFailure,
  deleteClientAgentSuccess,
  loadClientAgent,
  loadClientAgentCommands,
  loadClientAgentCommandsSuccess,
  loadClientAgentFailure,
  loadClientAgents,
  loadClientAgentsFailure,
  loadClientAgentsSuccess,
  loadClientAgentSuccess,
  updateClientAgent,
  updateClientAgentFailure,
  updateClientAgentSuccess,
} from './agents.actions';
import {
  createClientAgent$,
  deleteClientAgent$,
  loadClientAgent$,
  loadClientAgentCommandsFromFiles$,
  loadClientAgentCommandsLoading$,
  loadClientAgents$,
  updateClientAgent$,
} from './agents.effects';
import type { AgentResponseDto, CreateAgentDto, CreateAgentResponseDto, UpdateAgentDto } from './agents.types';

describe('AgentsEffects', () => {
  let actions$: Actions;
  let agentsService: jest.Mocked<AgentsService>;
  const clientId = 'client-1';

  const mockAgent: AgentResponseDto = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'Test Description',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockCreateAgentResponse: CreateAgentResponseDto = {
    ...mockAgent,
    password: 'generated-password',
  };

  beforeEach(() => {
    agentsService = {
      listClientAgents: jest.fn(),
      getClientAgent: jest.fn(),
      createClientAgent: jest.fn(),
      updateClientAgent: jest.fn(),
      deleteClientAgent: jest.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        {
          provide: AgentsService,
          useValue: agentsService,
        },
      ],
    });

    actions$ = TestBed.inject(Actions);
  });

  describe('loadClientAgents$', () => {
    it('should return loadClientAgentsSuccess on success', (done) => {
      const agents: AgentResponseDto[] = [mockAgent];
      const action = loadClientAgents({ clientId });
      const outcome = loadClientAgentsSuccess({ clientId, agents });

      actions$ = of(action);
      agentsService.listClientAgents.mockReturnValue(of(agents));

      loadClientAgents$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return loadClientAgentsFailure on error', (done) => {
      const action = loadClientAgents({ clientId });
      const error = new Error('Load failed');
      const outcome = loadClientAgentsFailure({ clientId, error: 'Load failed' });

      actions$ = of(action);
      agentsService.listClientAgents.mockReturnValue(throwError(() => error));

      loadClientAgents$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should pass params to service', (done) => {
      const params = { limit: 10, offset: 20 };
      const action = loadClientAgents({ clientId, params });
      const agents: AgentResponseDto[] = [mockAgent];

      actions$ = of(action);
      agentsService.listClientAgents.mockReturnValue(of(agents));

      loadClientAgents$(actions$, agentsService).subscribe(() => {
        expect(agentsService.listClientAgents).toHaveBeenCalledWith(clientId, params);
        done();
      });
    });
  });

  describe('loadClientAgent$', () => {
    it('should return loadClientAgentSuccess on success', (done) => {
      const agentId = 'agent-1';
      const action = loadClientAgent({ clientId, agentId });
      const outcome = loadClientAgentSuccess({ clientId, agent: mockAgent });

      actions$ = of(action);
      agentsService.getClientAgent.mockReturnValue(of(mockAgent));

      loadClientAgent$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return loadClientAgentFailure on error', (done) => {
      const agentId = 'agent-1';
      const action = loadClientAgent({ clientId, agentId });
      const error = new Error('Load failed');
      const outcome = loadClientAgentFailure({ clientId, error: 'Load failed' });

      actions$ = of(action);
      agentsService.getClientAgent.mockReturnValue(throwError(() => error));

      loadClientAgent$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('createClientAgent$', () => {
    it('should return createClientAgentSuccess on success', (done) => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };
      const action = createClientAgent({ clientId, agent: createDto });
      const outcome = createClientAgentSuccess({ clientId, agent: mockCreateAgentResponse });

      actions$ = of(action);
      agentsService.createClientAgent.mockReturnValue(of(mockCreateAgentResponse));

      createClientAgent$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return createClientAgentFailure on error', (done) => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };
      const action = createClientAgent({ clientId, agent: createDto });
      const error = new Error('Create failed');
      const outcome = createClientAgentFailure({ clientId, error: 'Create failed' });

      actions$ = of(action);
      agentsService.createClientAgent.mockReturnValue(throwError(() => error));

      createClientAgent$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('updateClientAgent$', () => {
    it('should return updateClientAgentSuccess on success', (done) => {
      const agentId = 'agent-1';
      const updateDto: UpdateAgentDto = { name: 'Updated Agent' };
      const action = updateClientAgent({ clientId, agentId, agent: updateDto });
      const updatedAgent = { ...mockAgent, name: 'Updated Agent' };
      const outcome = updateClientAgentSuccess({ clientId, agent: updatedAgent });

      actions$ = of(action);
      agentsService.updateClientAgent.mockReturnValue(of(updatedAgent));

      updateClientAgent$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return updateClientAgentFailure on error', (done) => {
      const agentId = 'agent-1';
      const updateDto: UpdateAgentDto = { name: 'Updated Agent' };
      const action = updateClientAgent({ clientId, agentId, agent: updateDto });
      const error = new Error('Update failed');
      const outcome = updateClientAgentFailure({ clientId, error: 'Update failed' });

      actions$ = of(action);
      agentsService.updateClientAgent.mockReturnValue(throwError(() => error));

      updateClientAgent$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('deleteClientAgent$', () => {
    it('should return deleteClientAgentSuccess on success', (done) => {
      const agentId = 'agent-1';
      const action = deleteClientAgent({ clientId, agentId });
      const outcome = deleteClientAgentSuccess({ clientId, agentId });

      actions$ = of(action);
      agentsService.deleteClientAgent.mockReturnValue(of(undefined));

      deleteClientAgent$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return deleteClientAgentFailure on error', (done) => {
      const agentId = 'agent-1';
      const action = deleteClientAgent({ clientId, agentId });
      const error = new Error('Delete failed');
      const outcome = deleteClientAgentFailure({ clientId, error: 'Delete failed' });

      actions$ = of(action);
      agentsService.deleteClientAgent.mockReturnValue(throwError(() => error));

      deleteClientAgent$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('error normalization', () => {
    it('should normalize Error objects', (done) => {
      const action = loadClientAgents({ clientId });
      const error = new Error('Test error');
      const outcome = loadClientAgentsFailure({ clientId, error: 'Test error' });

      actions$ = of(action);
      agentsService.listClientAgents.mockReturnValue(throwError(() => error));

      loadClientAgents$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should normalize string errors', (done) => {
      const action = loadClientAgents({ clientId });
      const error = 'String error';
      const outcome = loadClientAgentsFailure({ clientId, error: 'String error' });

      actions$ = of(action);
      agentsService.listClientAgents.mockReturnValue(throwError(() => error));

      loadClientAgents$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should normalize object errors with message property', (done) => {
      const action = loadClientAgents({ clientId });
      const error = { message: 'Object error' };
      const outcome = loadClientAgentsFailure({ clientId, error: 'Object error' });

      actions$ = of(action);
      agentsService.listClientAgents.mockReturnValue(throwError(() => error));

      loadClientAgents$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should use default error message for unknown error types', (done) => {
      const action = loadClientAgents({ clientId });
      const error = { unknown: 'property' };
      const outcome = loadClientAgentsFailure({ clientId, error: 'An unexpected error occurred' });

      actions$ = of(action);
      agentsService.listClientAgents.mockReturnValue(throwError(() => error));

      loadClientAgents$(actions$, agentsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('loadClientAgentCommandsLoading$', () => {
    const agentId = 'agent-1';

    it('should dispatch loadClientAgentCommands when listing .cursor/commands directory', (done) => {
      const action = listDirectory({
        clientId,
        agentId,
        params: { path: '.cursor/commands' },
      });
      const outcome = loadClientAgentCommands({ clientId, agentId });

      actions$ = of(action);

      loadClientAgentCommandsLoading$(actions$).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should ignore directory listings for other paths', (done) => {
      const action = listDirectory({
        clientId,
        agentId,
        params: { path: 'other' },
      });

      actions$ = of(action);
      let called = false;

      loadClientAgentCommandsLoading$(actions$).subscribe({
        next: () => {
          called = true;
        },
        complete: () => {
          expect(called).toBe(false);
          done();
        },
      });
    });
  });

  describe('loadClientAgentCommandsFromFiles$', () => {
    const agentId = 'agent-1';

    it('should extract commands from .md files in .cursor/commands directory', (done) => {
      const files: FileNodeDto[] = [
        { name: 'command1.md', type: 'file', path: '.cursor/commands/command1.md' },
        { name: 'command2.md', type: 'file', path: '.cursor/commands/command2.md' },
        { name: 'readme.txt', type: 'file', path: '.cursor/commands/readme.txt' },
        { name: 'subdir', type: 'directory', path: '.cursor/commands/subdir' },
      ];
      const action = listDirectorySuccess({
        clientId,
        agentId,
        directoryPath: '.cursor/commands',
        files,
      });
      const outcome = loadClientAgentCommandsSuccess({
        clientId,
        agentId,
        commands: ['/command1', '/command2'],
      });

      actions$ = of(action);

      loadClientAgentCommandsFromFiles$(actions$).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return empty commands array when no .md files exist', (done) => {
      const files: FileNodeDto[] = [
        { name: 'readme.txt', type: 'file', path: '.cursor/commands/readme.txt' },
        { name: 'subdir', type: 'directory', path: '.cursor/commands/subdir' },
      ];
      const action = listDirectorySuccess({
        clientId,
        agentId,
        directoryPath: '.cursor/commands',
        files,
      });
      const outcome = loadClientAgentCommandsSuccess({
        clientId,
        agentId,
        commands: [],
      });

      actions$ = of(action);

      loadClientAgentCommandsFromFiles$(actions$).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return empty commands array when directory listing fails', (done) => {
      const action = listDirectoryFailure({
        clientId,
        agentId,
        directoryPath: '.cursor/commands',
        error: 'Directory not found',
      });
      const outcome = loadClientAgentCommandsSuccess({
        clientId,
        agentId,
        commands: [],
      });

      actions$ = of(action);

      loadClientAgentCommandsFromFiles$(actions$).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should ignore non-.cursor/commands directory listings', (done) => {
      const files: FileNodeDto[] = [{ name: 'command1.md', type: 'file', path: 'other/command1.md' }];
      const action = listDirectorySuccess({
        clientId,
        agentId,
        directoryPath: 'other',
        files,
      });

      actions$ = of(action);
      let called = false;

      loadClientAgentCommandsFromFiles$(actions$).subscribe({
        next: () => {
          called = true;
        },
        complete: () => {
          expect(called).toBe(false);
          done();
        },
      });
    });

    it('should handle files with .md extension in subdirectories correctly', (done) => {
      const files: FileNodeDto[] = [
        { name: 'command1.md', type: 'file', path: '.cursor/commands/command1.md' },
        { name: 'subdir', type: 'directory', path: '.cursor/commands/subdir' },
      ];
      const action = listDirectorySuccess({
        clientId,
        agentId,
        directoryPath: '.cursor/commands',
        files,
      });
      const outcome = loadClientAgentCommandsSuccess({
        clientId,
        agentId,
        commands: ['/command1'],
      });

      actions$ = of(action);

      loadClientAgentCommandsFromFiles$(actions$).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });
});
