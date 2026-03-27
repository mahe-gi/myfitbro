import { describe, it, expect } from '@jest/globals';
import { toDisplayWeight, toStorageWeight } from '../../utils/units';

describe('unit conversion', () => {
  describe('toDisplayWeight', () => {
    it('converts 100 kg to 220.5 lbs', () => {
      expect(toDisplayWeight(100, 'lbs')).toBe(220.5);
    });

    it('converts 50 kg to 110.2 lbs', () => {
      expect(toDisplayWeight(50, 'lbs')).toBe(110.2);
    });

    it('converts 1 kg to 2.2 lbs', () => {
      expect(toDisplayWeight(1, 'lbs')).toBe(2.2);
    });

    it('returns same value when unit is kg', () => {
      expect(toDisplayWeight(75, 'kg')).toBe(75);
      expect(toDisplayWeight(0.5, 'kg')).toBe(0.5);
    });
  });

  describe('toStorageWeight', () => {
    it('converts lbs back to kg (round-trip 100 kg)', () => {
      const lbs = toDisplayWeight(100, 'lbs');
      const backToKg = toStorageWeight(lbs, 'lbs');
      // toDisplayWeight rounds to 1 decimal place in lbs, introducing up to ~0.023 kg error
      expect(Math.abs(backToKg - 100)).toBeLessThanOrEqual(0.05);
    });

    it('converts lbs back to kg (round-trip 50 kg)', () => {
      const lbs = toDisplayWeight(50, 'lbs');
      const backToKg = toStorageWeight(lbs, 'lbs');
      expect(Math.abs(backToKg - 50)).toBeLessThanOrEqual(0.05);
    });

    it('returns same value when unit is kg', () => {
      expect(toStorageWeight(75, 'kg')).toBe(75);
    });
  });
});
