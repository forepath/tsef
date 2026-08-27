export function joinRemoteCommand(parts: string[]): string {
  return parts
    .map((part) => {
      if (part.length === 0) {
        return "''";
      }

      if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(part)) {
        return part;
      }

      return `'${part.replace(/'/g, `'\\''`)}'`;
    })
    .join(' ');
}
