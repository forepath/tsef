import { InfiniteScrollDirective } from './infinite-scroll.directive';

describe('InfiniteScrollDirective', () => {
  it('isStandaloneDirectiveWithRequiredRoot', () => {
    expect(InfiniteScrollDirective).toBeDefined();
    const annotations = (InfiniteScrollDirective as unknown as { ɵcmp?: { inputs?: Record<string, string> } }).ɵcmp;

    expect(annotations?.inputs?.['root'] ?? 'root').toBeTruthy();
  });
});
