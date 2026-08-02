import { parseChangelogMarkdownLinks } from './changelog-text.utils';

describe('parseChangelogMarkdownLinks', () => {
  it('returns plain text when there are no links', () => {
    expect(parseChangelogMarkdownLinks('fix generator input')).toEqual([
      { kind: 'text', value: 'fix generator input' },
    ]);
  });

  it('parses issue and commit markdown links', () => {
    const text =
      'generator input and entrypoint mapping ([#537](https://github.com/forepath/one/issues/537)) ([1ae4d85](https://github.com/forepath/one/commit/1ae4d85cfdaaf3352eccd6ba075e7f0cdeaaef42))';

    expect(parseChangelogMarkdownLinks(text)).toEqual([
      { kind: 'text', value: 'generator input and entrypoint mapping (' },
      {
        kind: 'link',
        label: '#537',
        href: 'https://github.com/forepath/one/issues/537',
      },
      { kind: 'text', value: ') (' },
      {
        kind: 'link',
        label: '1ae4d85',
        href: 'https://github.com/forepath/one/commit/1ae4d85cfdaaf3352eccd6ba075e7f0cdeaaef42',
      },
      { kind: 'text', value: ')' },
    ]);
  });

  it('leaves non-http schemes as plain text', () => {
    expect(parseChangelogMarkdownLinks('[x](javascript:alert(1))')).toEqual([
      { kind: 'text', value: '[x](javascript:alert(1))' },
    ]);
  });

  it('handles empty input', () => {
    expect(parseChangelogMarkdownLinks('')).toEqual([]);
  });
});
