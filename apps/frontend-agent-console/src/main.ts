import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Create worker URLs that resolve to node_modules during build
// Use import.meta.url as base and construct path to node_modules
// From apps/frontend-agent-console/src/main.ts, go up 3 levels to workspace root, then into node_modules
const getWorkerUrl = (relativePath: string): URL => {
  // Get the directory of the current file (apps/frontend-agent-console/src/)
  const currentDir = new URL('.', import.meta.url);
  // Go up to workspace root: ../../
  const workspaceRoot = new URL('../../', currentDir);
  // Go into node_modules/monaco-editor/esm/vs/
  return new URL(`node_modules/monaco-editor/esm/vs/${relativePath}`, workspaceRoot);
};

const editorWorker = new Worker(getWorkerUrl('editor/editor.worker.js'), { type: 'module' });
const tsWorker = new Worker(getWorkerUrl('language/typescript/ts.worker.js'), { type: 'module' });
const cssWorker = new Worker(getWorkerUrl('language/css/css.worker.js'), { type: 'module' });
const htmlWorker = new Worker(getWorkerUrl('language/html/html.worker.js'), { type: 'module' });
const jsonWorker = new Worker(getWorkerUrl('language/json/json.worker.js'), { type: 'module' });

// Configure Monaco Editor workers
// Simple approach: use getWorkerUrl to return absolute URLs
// This works regardless of deployment path (subfolder, root, etc.)
declare const self: Window & {
  MonacoEnvironment?: {
    getWorker: (moduleId: string, label: string) => Worker;
  };
};

self.MonacoEnvironment = {
  getWorker: function (moduleId: string, label: string): Worker {
    // Map worker labels to their file paths in assets
    const workerPaths: Record<string, Worker> = {
      editorWorkerService: editorWorker,
      typescript: tsWorker,
      javascript: tsWorker,
      css: cssWorker,
      html: htmlWorker,
      json: jsonWorker,
    };

    // Get the relative path for this worker
    return workerPaths[label] || workerPaths['editorWorkerService'];
  },
};

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
