import { resolveEmailEventId } from './resolve-email-event-id';

describe('resolveEmailEventId', () => {
  it('returns UUID correlation ids unchanged', () => {
    const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

    expect(resolveEmailEventId(id)).toBe(id);
  });

  it('maps non-UUID correlation ids to a stable UUID', () => {
    const key = 'price-recalc:decabill:user-1:2026-07-25';
    const first = resolveEmailEventId(key);
    const second = resolveEmailEventId(key);

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(second).toBe(first);
    expect(first).not.toBe(key);
  });

  it('returns a random UUID when correlation id is missing', () => {
    expect(resolveEmailEventId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
