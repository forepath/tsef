/**
 * Renders a template string by replacing {{key}} placeholders.
 */
export function renderTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = values[key];

    if (value === undefined) {
      throw new Error(`Missing template value: ${key}`);
    }

    return String(value);
  });
}
