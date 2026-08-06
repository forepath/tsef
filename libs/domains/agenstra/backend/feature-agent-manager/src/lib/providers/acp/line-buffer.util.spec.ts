import { drainLineBuffer } from './line-buffer.util';

describe('drainLineBuffer', () => {
  it('yields complete lines and returns the trailing remainder', () => {
    const iterator = drainLineBuffer('line1\nline2', '\nline3');
    const lines: string[] = [];
    let step = iterator.next();

    while (!step.done) {
      lines.push(step.value);
      step = iterator.next();
    }

    expect(lines).toEqual(['line1', 'line2']);
    expect(step.value).toBe('line3');
  });

  it('ignores empty lines', () => {
    const iterator = drainLineBuffer('', '\nfirst\n\nsecond\n');
    const lines: string[] = [];
    let step = iterator.next();

    while (!step.done) {
      lines.push(step.value);
      step = iterator.next();
    }

    expect(lines).toEqual(['first', 'second']);
    expect(step.value).toBe('');
  });

  it('returns combined remainder when no newline is present', () => {
    const iterator = drainLineBuffer('partial', '-chunk');
    const step = iterator.next();

    expect(step.done).toBe(true);
    expect(step.value).toBe('partial-chunk');
  });
});
