import { CURSOR_ACP_STALE_AUTH_TEXT, isCursorAcpStaleAuthPrefix, isCursorAcpStaleAuthResponse } from './acp-stale-auth';

describe('acp-stale-auth', () => {
  describe('isCursorAcpStaleAuthResponse', () => {
    it('matches the exact Cursor sign-in line', () => {
      expect(isCursorAcpStaleAuthResponse(CURSOR_ACP_STALE_AUTH_TEXT)).toBe(true);
    });

    it('matches case and whitespace variants', () => {
      expect(isCursorAcpStaleAuthResponse('  please SIGN IN to continue  ')).toBe(true);
      expect(isCursorAcpStaleAuthResponse('Please sign in to continue.')).toBe(true);
    });

    it('rejects empty or unrelated replies', () => {
      expect(isCursorAcpStaleAuthResponse('')).toBe(false);
      expect(isCursorAcpStaleAuthResponse('Please sign in to continue and then run tests')).toBe(false);
      expect(isCursorAcpStaleAuthResponse('Unauthorized. Please login first.')).toBe(false);
    });
  });

  describe('isCursorAcpStaleAuthPrefix', () => {
    it('holds empty and partial prefixes', () => {
      expect(isCursorAcpStaleAuthPrefix('')).toBe(true);
      expect(isCursorAcpStaleAuthPrefix('Please')).toBe(true);
      expect(isCursorAcpStaleAuthPrefix('Please sign in to continue')).toBe(true);
    });

    it('releases once text diverges from the sign-in line', () => {
      expect(isCursorAcpStaleAuthPrefix('Please deploy')).toBe(false);
      expect(isCursorAcpStaleAuthPrefix('Hello')).toBe(false);
    });
  });
});
