import * as fs from 'node:fs';
import * as path from 'node:path';

const templateCache = new Map<string, string>();

export function readTemplateFile(templatePath: string): string {
  const absolutePath = path.resolve(templatePath);
  const cached = templateCache.get(absolutePath);

  if (cached) {
    return cached;
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  templateCache.set(absolutePath, content);
  return content;
}

export function readTemplateFromDir(templateDir: string, fileName: string): string {
  return readTemplateFile(path.join(templateDir, fileName));
}
