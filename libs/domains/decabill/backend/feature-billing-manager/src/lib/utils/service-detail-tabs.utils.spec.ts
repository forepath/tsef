import {
  appendServiceTabs,
  createDetailsTab,
  sanitizeCloudInitServiceTabs,
  sortResolvedServiceTabs,
} from './service-detail-tabs.utils';

describe('service-detail-tabs.utils', () => {
  describe('appendServiceTabs', () => {
    it('appends visible tabs and skips duplicate ids', () => {
      const tabs = [createDetailsTab()];

      appendServiceTabs(
        tabs,
        [
          { id: 'stack-overview', label: 'Overview', order: 50 },
          { id: 'details', label: 'Should skip', order: 1 },
        ],
        'integrated',
        'agenstra-controller',
        { subscriptionId: 'sub-1', itemId: 'item-1' },
      );

      expect(tabs).toHaveLength(2);
      expect(tabs[1]).toEqual({
        id: 'stack-overview',
        label: 'Overview',
        order: 50,
        moduleKey: 'agenstra-controller',
        source: 'integrated',
      });
    });

    it('respects isVisible returning false', () => {
      const tabs = [createDetailsTab()];

      appendServiceTabs(
        tabs,
        [{ id: 'hidden', label: 'Hidden', order: 10, isVisible: () => false }],
        'addon',
        'container-manager',
        { subscriptionId: 'sub-1', itemId: 'item-1' },
      );

      expect(tabs).toHaveLength(1);
    });
  });

  describe('sortResolvedServiceTabs', () => {
    it('sorts by order then id', () => {
      const sorted = sortResolvedServiceTabs([
        { id: 'b', label: 'B', order: 10, moduleKey: 'x', source: 'addon' },
        { id: 'a', label: 'A', order: 10, moduleKey: 'x', source: 'addon' },
        createDetailsTab(),
      ]);

      expect(sorted.map((tab) => tab.id)).toEqual(['details', 'a', 'b']);
    });
  });

  describe('sanitizeCloudInitServiceTabs', () => {
    it('returns empty array for undefined or empty input', () => {
      expect(sanitizeCloudInitServiceTabs(undefined)).toEqual([]);
      expect(sanitizeCloudInitServiceTabs([])).toEqual([]);
    });

    it('normalizes valid tabs', () => {
      expect(sanitizeCloudInitServiceTabs([{ id: ' my-tab ', label: ' My Tab ', order: 20.7 }])).toEqual([
        { id: 'my-tab', label: 'My Tab', order: 20 },
      ]);
    });

    it('rejects reserved details id', () => {
      expect(() => sanitizeCloudInitServiceTabs([{ id: 'details', label: 'X', order: 1 }])).toThrow(
        /reserved id "details"/,
      );
    });

    it('rejects reserved container-manager id', () => {
      expect(() => sanitizeCloudInitServiceTabs([{ id: 'container-manager', label: 'X', order: 1 }])).toThrow(
        /reserved id "container-manager"/,
      );
    });

    it('rejects invalid slug ids and duplicates', () => {
      expect(() => sanitizeCloudInitServiceTabs([{ id: 'Bad_Id', label: 'X', order: 1 }])).toThrow(
        /Invalid service tab id/,
      );
      expect(() =>
        sanitizeCloudInitServiceTabs([
          { id: 'a', label: 'A', order: 1 },
          { id: 'a', label: 'B', order: 2 },
        ]),
      ).toThrow(/Duplicate service tab id/);
    });
  });
});
