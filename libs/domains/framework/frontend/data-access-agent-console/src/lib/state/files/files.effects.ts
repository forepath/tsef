import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, of, switchMap, exhaustMap } from 'rxjs';
import { FilesService } from '../../services/files.service';
import {
  createFileOrDirectory,
  createFileOrDirectoryFailure,
  createFileOrDirectorySuccess,
  deleteFileOrDirectory,
  deleteFileOrDirectoryFailure,
  deleteFileOrDirectorySuccess,
  listDirectory,
  listDirectoryFailure,
  listDirectorySuccess,
  readFile,
  readFileFailure,
  readFileSuccess,
  writeFile,
  writeFileFailure,
  writeFileSuccess,
} from './files.actions';

/**
 * Normalizes error messages from HTTP errors.
 */
function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
}

export const readFile$ = createEffect(
  (actions$ = inject(Actions), filesService = inject(FilesService)) => {
    return actions$.pipe(
      ofType(readFile),
      switchMap(({ clientId, agentId, filePath }) =>
        filesService.readFile(clientId, agentId, filePath).pipe(
          map((content) => readFileSuccess({ clientId, agentId, filePath, content })),
          catchError((error) => of(readFileFailure({ clientId, agentId, filePath, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const writeFile$ = createEffect(
  (actions$ = inject(Actions), filesService = inject(FilesService)) => {
    return actions$.pipe(
      ofType(writeFile),
      exhaustMap(({ clientId, agentId, filePath, writeFileDto }) =>
        filesService.writeFile(clientId, agentId, filePath, writeFileDto).pipe(
          map(() => writeFileSuccess({ clientId, agentId, filePath })),
          catchError((error) => of(writeFileFailure({ clientId, agentId, filePath, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const listDirectory$ = createEffect(
  (actions$ = inject(Actions), filesService = inject(FilesService)) => {
    return actions$.pipe(
      ofType(listDirectory),
      mergeMap(({ clientId, agentId, params }) =>
        filesService.listDirectory(clientId, agentId, params).pipe(
          map((files) => listDirectorySuccess({ clientId, agentId, directoryPath: params?.path || '.', files })),
          catchError((error) =>
            of(
              listDirectoryFailure({
                clientId,
                agentId,
                directoryPath: params?.path || '.',
                error: normalizeError(error),
              }),
            ),
          ),
        ),
      ),
    );
  },
  { functional: true },
);

export const createFileOrDirectory$ = createEffect(
  (actions$ = inject(Actions), filesService = inject(FilesService)) => {
    return actions$.pipe(
      ofType(createFileOrDirectory),
      exhaustMap(({ clientId, agentId, filePath, createFileDto }) =>
        filesService.createFileOrDirectory(clientId, agentId, filePath, createFileDto).pipe(
          map(() => createFileOrDirectorySuccess({ clientId, agentId, filePath, fileType: createFileDto.type })),
          catchError((error) =>
            of(createFileOrDirectoryFailure({ clientId, agentId, filePath, error: normalizeError(error) })),
          ),
        ),
      ),
    );
  },
  { functional: true },
);

export const deleteFileOrDirectory$ = createEffect(
  (actions$ = inject(Actions), filesService = inject(FilesService)) => {
    return actions$.pipe(
      ofType(deleteFileOrDirectory),
      exhaustMap(({ clientId, agentId, filePath }) =>
        filesService.deleteFileOrDirectory(clientId, agentId, filePath).pipe(
          map(() => deleteFileOrDirectorySuccess({ clientId, agentId, filePath })),
          catchError((error) =>
            of(deleteFileOrDirectoryFailure({ clientId, agentId, filePath, error: normalizeError(error) })),
          ),
        ),
      ),
    );
  },
  { functional: true },
);
