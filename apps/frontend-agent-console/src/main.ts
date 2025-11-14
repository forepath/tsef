import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Configure Monaco Editor worker paths to use absolute paths
// This prevents issues with relative paths in workers
declare const self: Window & {
  MonacoEnvironment?: {
    getWorkerUrl: (moduleId: string, label: string) => string;
  };
};

self.MonacoEnvironment = {
  getWorkerUrl: (moduleId: string, label: string) => {
    // Convert relative paths to absolute paths
    // Monaco workers are located at /assets/monaco/min/vs/
    const basePath = '/assets/monaco/min/vs';

    // Map worker labels to their file paths
    // Note: Monaco minified workers use camelCase names (e.g., jsonWorker.js, not json.worker.js)
    const workerMap: Record<string, string> = {
      editorWorkerService: `${basePath}/base/worker/workerMain.js`,
      typescript: `${basePath}/language/typescript/tsWorker.js`,
      javascript: `${basePath}/language/typescript/tsWorker.js`,
      css: `${basePath}/language/css/cssWorker.js`,
      html: `${basePath}/language/html/htmlWorker.js`,
      json: `${basePath}/language/json/jsonWorker.js`,
    };

    // Return the mapped worker URL or default to base worker
    // Use absolute path to prevent relative path issues in workers
    const workerUrl = workerMap[label] || `${basePath}/base/worker/workerMain.js`;

    // Ensure the URL is absolute (starts with /)
    return workerUrl.startsWith('/') ? workerUrl : `/${workerUrl}`;
  },
};

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
