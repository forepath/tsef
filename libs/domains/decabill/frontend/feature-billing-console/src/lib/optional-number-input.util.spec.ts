import { optionalNumberInputValue } from './optional-number-input.util';

describe('optionalNumberInputValue', () => {
  it('returns empty string for null, undefined, and empty string', () => {
    expect(optionalNumberInputValue(null)).toBe('');
    expect(optionalNumberInputValue(undefined)).toBe('');
    expect(optionalNumberInputValue('')).toBe('');
  });

  it('stringifies numbers from type=number ngModel without throwing', () => {
    expect(optionalNumberInputValue(1.25)).toBe('1.25');
    expect(optionalNumberInputValue(0)).toBe('0');
  });

  it('trims string input', () => {
    expect(optionalNumberInputValue('  3.5  ')).toBe('3.5');
  });
});
