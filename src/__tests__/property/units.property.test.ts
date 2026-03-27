// Feature: fitness-tracker-app, Property 17: Unit conversion round-trip
import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { toDisplayWeight, toStorageWeight } from '../../utils/units';

const arbKgWeight = fc.float({ min: Math.fround(0.1), max: Math.fround(500), noNaN: true });

describe('units property tests', () => {
  // Feature: fitness-tracker-app, Property 17: Unit conversion round-trip
  // Validates: Requirements 12.3, 12.6
  it('Property 17: converting kg to lbs and back to kg stays within 0.05 kg of original', () => {
    fc.assert(
      fc.property(arbKgWeight, (kg) => {
        const displayLbs = toDisplayWeight(kg, 'lbs');
        const backToKg = toStorageWeight(displayLbs, 'lbs');
        // toDisplayWeight rounds to 1 decimal place in lbs, introducing up to ~0.023 kg error
        expect(Math.abs(backToKg - kg)).toBeLessThanOrEqual(0.05);
      }),
      { numRuns: 100 },
    );
  });
});
