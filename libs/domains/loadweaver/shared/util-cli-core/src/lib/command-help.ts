/**
 * Appends standard usage examples to commander subcommands.
 */
export function withExamples(
  command: { addHelpText: (position: string, text: string) => unknown },
  examples: string[],
): void {
  if (examples.length === 0) {
    return;
  }

  const body = examples.map((line) => `  ${line}`).join('\n');
  command.addHelpText('after', `\nExamples:\n${body}\n`);
}
