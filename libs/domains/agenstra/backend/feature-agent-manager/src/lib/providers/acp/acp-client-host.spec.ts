import type { PermissionOption } from '@agentclientprotocol/sdk';

import { selectAutoApprovePermissionOptionId } from './acp-client-host';

describe('selectAutoApprovePermissionOptionId', () => {
  it('prefers allow_always over allow_once and reject options', () => {
    const options: PermissionOption[] = [
      { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
      { optionId: 'once', name: 'Allow once', kind: 'allow_once' },
      { optionId: 'always', name: 'Allow always', kind: 'allow_always' },
    ];

    expect(selectAutoApprovePermissionOptionId(options)).toBe('always');
  });

  it('prefers allow_once when allow_always is absent', () => {
    const options: PermissionOption[] = [
      { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
      { optionId: 'once', name: 'Allow once', kind: 'allow_once' },
    ];

    expect(selectAutoApprovePermissionOptionId(options)).toBe('once');
  });

  it('falls back to the first option when no allow_* kinds exist', () => {
    const options: PermissionOption[] = [{ optionId: 'only', name: 'Only', kind: 'reject_once' }];

    expect(selectAutoApprovePermissionOptionId(options)).toBe('only');
  });
});
