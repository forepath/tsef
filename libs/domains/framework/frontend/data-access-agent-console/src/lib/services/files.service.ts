import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type {
  CreateFileDto,
  FileContentDto,
  FileNodeDto,
  ListDirectoryParams,
  MoveFileDto,
  WriteFileDto,
} from '../state/files/files.types';

@Injectable({
  providedIn: 'root',
})
export class FilesService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  /**
   * Get the base URL for the API.
   */
  private get apiUrl(): string {
    return this.environment.controller?.restApiUrl || 'http://localhost:3100/api';
  }

  /**
   * Encode a file path for use in URL path segments.
   * Encodes each segment separately to preserve forward slashes,
   * which are needed for NestJS wildcard path parameter parsing.
   * @param filePath - The file path to encode
   * @returns The encoded path with forward slashes preserved
   */
  private encodePath(filePath: string): string {
    // Split by forward slash, encode each segment, then rejoin
    return filePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  /**
   * Read file content from agent container.
   * @param clientId - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param filePath - The file path relative to /app
   * @returns Observable of file content (base64-encoded)
   */
  readFile(clientId: string, agentId: string, filePath: string): Observable<FileContentDto> {
    const encodedPath = this.encodePath(filePath);
    return this.http.get<FileContentDto>(`${this.apiUrl}/clients/${clientId}/agents/${agentId}/files/${encodedPath}`);
  }

  /**
   * Write file content to agent container.
   * @param clientId - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param filePath - The file path relative to /app
   * @param writeFileDto - The file content to write (base64-encoded)
   * @returns Observable of void
   */
  writeFile(clientId: string, agentId: string, filePath: string, writeFileDto: WriteFileDto): Observable<void> {
    const encodedPath = this.encodePath(filePath);
    return this.http.put<void>(
      `${this.apiUrl}/clients/${clientId}/agents/${agentId}/files/${encodedPath}`,
      writeFileDto,
    );
  }

  /**
   * List directory contents in agent container.
   * @param clientId - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param params - Optional directory path
   * @returns Observable of file nodes array
   */
  listDirectory(clientId: string, agentId: string, params?: ListDirectoryParams): Observable<FileNodeDto[]> {
    let httpParams = new HttpParams();
    if (params?.path !== undefined) {
      httpParams = httpParams.set('path', params.path);
    }

    return this.http.get<FileNodeDto[]>(`${this.apiUrl}/clients/${clientId}/agents/${agentId}/files`, {
      params: httpParams,
    });
  }

  /**
   * Create a file or directory in agent container.
   * @param clientId - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param filePath - The file path relative to /app
   * @param createFileDto - The file/directory creation data
   * @returns Observable of void
   */
  createFileOrDirectory(
    clientId: string,
    agentId: string,
    filePath: string,
    createFileDto: CreateFileDto,
  ): Observable<void> {
    const encodedPath = this.encodePath(filePath);
    return this.http.post<void>(
      `${this.apiUrl}/clients/${clientId}/agents/${agentId}/files/${encodedPath}`,
      createFileDto,
    );
  }

  /**
   * Delete a file or directory from agent container.
   * @param clientId - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param filePath - The file path relative to /app
   * @returns Observable of void
   */
  deleteFileOrDirectory(clientId: string, agentId: string, filePath: string): Observable<void> {
    const encodedPath = this.encodePath(filePath);
    return this.http.delete<void>(`${this.apiUrl}/clients/${clientId}/agents/${agentId}/files/${encodedPath}`);
  }

  /**
   * Move a file or directory in agent container.
   * @param clientId - The UUID of the client
   * @param agentId - The UUID of the agent
   * @param sourcePath - The source file path relative to /app
   * @param moveFileDto - The move operation data (destination path)
   * @returns Observable of void
   */
  moveFileOrDirectory(
    clientId: string,
    agentId: string,
    sourcePath: string,
    moveFileDto: MoveFileDto,
  ): Observable<void> {
    const encodedPath = this.encodePath(sourcePath);
    return this.http.patch<void>(
      `${this.apiUrl}/clients/${clientId}/agents/${agentId}/files/${encodedPath}`,
      moveFileDto,
    );
  }
}
