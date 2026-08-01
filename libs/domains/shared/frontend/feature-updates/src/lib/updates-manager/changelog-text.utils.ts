export type ChangelogTextPart = { kind: 'text'; value: string } | { kind: 'link'; label: string; href: string };

/** Markdown inline links only: `[label](https://...)` / `[label](http://...)`. */
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/**
 * Split changelog entry text into plain text and http(s) link parts for safe template rendering.
 * Non-http schemes and malformed markdown are left as plain text.
 */
export function parseChangelogMarkdownLinks(text: string): ChangelogTextPart[] {
  const source = text ?? '';
  const parts: ChangelogTextPart[] = [];
  let lastIndex = 0;

  for (const match of source.matchAll(MARKDOWN_LINK_RE)) {
    const matchIndex = match.index ?? 0;
    const [full, label, href] = match;

    if (matchIndex > lastIndex) {
      parts.push({ kind: 'text', value: source.slice(lastIndex, matchIndex) });
    }

    parts.push({ kind: 'link', label: label ?? '', href: href ?? '' });
    lastIndex = matchIndex + full.length;
  }

  if (lastIndex < source.length) {
    parts.push({ kind: 'text', value: source.slice(lastIndex) });
  }

  if (parts.length === 0 && source.length > 0) {
    return [{ kind: 'text', value: source }];
  }

  return parts;
}
