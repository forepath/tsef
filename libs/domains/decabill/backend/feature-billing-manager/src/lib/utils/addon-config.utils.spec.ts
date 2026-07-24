import { BadRequestException } from '@nestjs/common';

import {
  assertAddonConfigsMatchSelection,
  getAddonOrderFields,
  interpolateAddonScriptTemplate,
  mergeAddonDefaultValues,
  resolveAddonConfigValues,
  sanitizeAddonConfigFields,
} from './addon-config.utils';

describe('addon-config.utils', () => {
  describe('sanitizeAddonConfigFields', () => {
    it('normalizes env fields and defaults', () => {
      const result = sanitizeAddonConfigFields(
        [
          { key: ' API_KEY ', label: ' API Key ', showInOrderForm: true },
          {
            key: 'SECRET',
            label: 'Secret',
            showInOrderForm: false,
            useRandomDefault: true,
            randomDefaultLength: 24,
          },
        ],
        { API_KEY: ' admin-secret ', SECRET: 'ignored-when-random' },
      );

      expect(result.configSchema.environmentVariables).toEqual([
        {
          key: 'API_KEY',
          label: 'API Key',
          showInOrderForm: true,
          hasDefault: true,
        },
        {
          key: 'SECRET',
          label: 'Secret',
          showInOrderForm: false,
          hasDefault: true,
          useRandomDefault: true,
          randomDefaultLength: 24,
          randomDefaultSpecialChars: false,
        },
      ]);
      expect(result.configDefaultValues).toEqual({ API_KEY: 'admin-secret' });
    });

    it('rejects unknown default keys and invalid keys', () => {
      expect(() =>
        sanitizeAddonConfigFields([{ key: 'API_KEY', label: 'Key', showInOrderForm: true }], {
          OTHER: 'x',
        }),
      ).toThrow(BadRequestException);

      expect(() => sanitizeAddonConfigFields([{ key: 'bad-key', label: 'Bad', showInOrderForm: false }], {})).toThrow(
        BadRequestException,
      );
    });
  });

  describe('resolveAddonConfigValues', () => {
    const fields = [
      { key: 'API_KEY', label: 'Key', showInOrderForm: true, hasDefault: true },
      { key: 'REGION', label: 'Region', showInOrderForm: true, hasDefault: false },
      {
        key: 'TOKEN',
        label: 'Token',
        showInOrderForm: false,
        hasDefault: true,
        useRandomDefault: true,
        randomDefaultLength: 21,
      },
    ];

    it('merges defaults, customer overrides, and random', () => {
      const resolved = resolveAddonConfigValues(fields, { API_KEY: 'admin' }, { REGION: 'eu', API_KEY: 'customer' });

      expect(resolved.API_KEY).toBe('customer');
      expect(resolved.REGION).toBe('eu');
      expect(resolved.TOKEN.length).toBeGreaterThanOrEqual(21);
    });

    it('fails on missing required and unknown keys', () => {
      expect(() => resolveAddonConfigValues(fields, { API_KEY: 'admin' }, {})).toThrow(BadRequestException);
      expect(() => resolveAddonConfigValues(fields, { API_KEY: 'admin' }, { REGION: 'eu', UNKNOWN: 'x' })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAddonOrderFields', () => {
    it('returns only showInOrderForm fields without values', () => {
      expect(
        getAddonOrderFields([
          { key: 'A', label: 'A', showInOrderForm: true, hasDefault: true },
          { key: 'B', label: 'B', showInOrderForm: false, hasDefault: false },
        ]),
      ).toEqual([{ key: 'A', label: 'A', description: null, required: false, hasDefault: true }]);
    });
  });

  describe('mergeAddonDefaultValues', () => {
    it('merges and clears empty values', () => {
      expect(
        mergeAddonDefaultValues({ KEEP: '1', CLEAR: '2' }, { CLEAR: '', ADD: '3' }, new Set(['KEEP', 'CLEAR', 'ADD'])),
      ).toEqual({ KEEP: '1', ADD: '3' });
    });
  });

  describe('interpolateAddonScriptTemplate', () => {
    it('substitutes env placeholders', () => {
      const rendered = interpolateAddonScriptTemplate('export KEY={{env.API_KEY}}', { API_KEY: 'secret' }, ['API_KEY']);

      expect(rendered).toContain('secret');
    });
  });

  describe('assertAddonConfigsMatchSelection', () => {
    it('rejects configs for unselected addons', () => {
      expect(() => assertAddonConfigsMatchSelection(['a'], { b: { KEY: '1' } })).toThrow(BadRequestException);
    });
  });
});
