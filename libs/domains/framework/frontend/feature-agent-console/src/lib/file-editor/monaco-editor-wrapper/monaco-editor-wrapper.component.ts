import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DoCheck,
  effect,
  HostListener,
  inject,
  input,
  NgZone,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

@Component({
  selector: 'framework-monaco-editor-wrapper',
  imports: [CommonModule, MonacoEditorModule],
  templateUrl: './monaco-editor-wrapper.component.html',
  styleUrls: ['./monaco-editor-wrapper.component.scss'],
  standalone: true,
})
export class MonacoEditorWrapperComponent implements OnDestroy, DoCheck {
  private readonly ngZone = inject(NgZone);

  // Inputs
  filePath = input<string | null>(null);
  content = input<string | null>(null);
  encoding = input<'utf-8' | 'base64'>('utf-8');
  isDirty = input<boolean>(false);

  // Outputs - using output() for modern Angular API
  contentChange = output<string>();
  saveRequest = output<void>();

  // Internal state
  editorInstance = signal<editor.IStandaloneCodeEditor | null>(null);
  isBinary = signal<boolean>(false);
  language = signal<string>('plaintext');
  private contentChangeDisposable: { dispose: () => void } | null = null;
  private lastContent: string | null = null;
  private isSettingInitialContent = false;
  private lastFilePath: string | null = null;
  private lastEncoding: 'utf-8' | 'base64' = 'utf-8';

  constructor() {
    // Watch for filePath and encoding changes to update binary status
    effect(() => {
      // Read signals to establish dependency tracking - effect will re-run when these change
      // The values are read again inside updateBinaryAndLanguage(), but we need to read them
      // here for the effect to track changes to these signals
      this.filePath();
      this.encoding();

      // Update binary status whenever filePath or encoding changes
      this.updateBinaryAndLanguage();
    });
  }

  readonly editorOptions = computed(() => ({
    theme: 'vs-dark' as const,
    language: this.language(),
    automaticLayout: true,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on' as const,
    wordWrap: 'on' as const,
    readOnly: this.isBinary(),
  }));

  ngOnDestroy(): void {
    if (this.contentChangeDisposable) {
      this.contentChangeDisposable.dispose();
    }
    const editor = this.editorInstance();
    if (editor) {
      try {
        editor.dispose();
      } catch (error) {
        // Ignore
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.onSave();
    }
  }

  onEditorInit(event: editor.IStandaloneCodeEditor | unknown): void {
    const editorInstance = event as editor.IStandaloneCodeEditor;
    if (!editorInstance || typeof editorInstance.getValue !== 'function') {
      return;
    }

    this.editorInstance.set(editorInstance);
    this.updateBinaryAndLanguage();

    // Dispose old listener if exists
    if (this.contentChangeDisposable) {
      this.contentChangeDisposable.dispose();
      this.contentChangeDisposable = null;
    }

    // Listen to user changes - this is the Monaco editor API, not ngx-monaco-editor
    this.contentChangeDisposable = editorInstance.onDidChangeModelContent(() => {
      // Skip if we're setting initial content (don't mark as dirty on load)
      if (this.isSettingInitialContent) {
        return;
      }

      if (this.isBinary()) {
        return;
      }

      const currentEditor = this.editorInstance();
      if (!currentEditor) {
        return;
      }

      try {
        const value = currentEditor.getValue();
        const base64 = btoa(value);

        // Ensure emit happens in Angular zone
        this.ngZone.run(() => {
          this.contentChange.emit(base64);
        });
      } catch (error) {
        // Silently handle encoding errors
      }
    });

    // Set initial content
    this.updateContent();
  }

  // Simple method to update content when input changes
  private updateContent(): void {
    const content = this.content();
    const editor = this.editorInstance();

    if (!editor || !content || this.isBinary()) {
      return;
    }

    // Skip if same content
    if (this.lastContent === content) {
      return;
    }

    try {
      const decoded = atob(content);
      const current = editor.getValue();

      // Only update if different
      if (current !== decoded) {
        // Set flag to prevent marking as dirty during initial content load
        this.isSettingInitialContent = true;
        const position = editor.getPosition();
        editor.setValue(decoded);
        if (position) {
          editor.setPosition(position);
        }
        // Clear flag after a brief delay to allow change event to process
        setTimeout(() => {
          this.isSettingInitialContent = false;
        }, 0);
      }

      this.lastContent = content;
    } catch (error) {
      this.isSettingInitialContent = false;
    }
  }

  // Watch for content input changes
  ngDoCheck(): void {
    const content = this.content();
    if (content !== this.lastContent && this.editorInstance()) {
      this.updateContent();
    }

    // Also check for filePath and encoding changes (fallback for effect)
    const filePath = this.filePath();
    const encoding = this.encoding();
    if (filePath !== this.lastFilePath || encoding !== this.lastEncoding) {
      this.lastFilePath = filePath;
      this.lastEncoding = encoding;
      this.updateBinaryAndLanguage();
    }
  }

  private updateBinaryAndLanguage(): void {
    const filePath = this.filePath();
    if (!filePath) {
      this.isBinary.set(false);
      return;
    }

    const binaryExtensions = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.bmp',
      '.svg',
      '.ico',
      '.webp',
      '.pdf',
      '.zip',
      '.tar',
      '.gz',
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.bin',
      '.woff',
      '.woff2',
      '.ttf',
      '.eot',
      '.otf',
    ];
    const lowerPath = filePath.toLowerCase();
    const isBinaryFile = binaryExtensions.some((ext) => lowerPath.endsWith(ext)) || this.encoding() === 'base64';
    this.isBinary.set(isBinaryFile);

    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      md: 'markdown',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      py: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      swift: 'swift',
      kt: 'kotlin',
      vue: 'vue',
      jsx: 'javascript',
      tsx: 'typescript',
      dockerfile: 'dockerfile',
    };
    const newLanguage = langMap[ext || ''] || 'plaintext';

    if (this.language() !== newLanguage) {
      const editor = this.editorInstance();
      if (editor) {
        const model = editor.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, newLanguage);
        }
      }
      this.language.set(newLanguage);
    }
  }

  onSave(): void {
    if (this.isBinary()) {
      return;
    }
    // Emit save request - parent will get content from editorContent signal
    this.saveRequest.emit();
  }

  // Method to get current content (can be called by parent via ViewChild if needed)
  getCurrentContent(): string | null {
    const editor = this.editorInstance();
    if (!editor || this.isBinary()) {
      return null;
    }
    try {
      const value = editor.getValue();
      return btoa(value);
    } catch (error) {
      return null;
    }
  }
}
