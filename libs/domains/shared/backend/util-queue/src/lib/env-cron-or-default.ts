/**
 * Reads a `*_CRON` env var. Missing, blank, or whitespace-only values use `defaultPattern`
 * so empty Compose/K8s overrides cannot register an invalid repeatable job.
 */
export function envCronOrDefault(name: string, defaultPattern: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name]?.trim();

  return value ? value : defaultPattern;
}
