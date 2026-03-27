 // Feature: fitness-tracker-app, Property 22: Workout set validation rejects invalid inputs
// Feature: fitness-tracker-app, Property 23: Weight entry validation rejects non-positive values
// Feature: fitness-tracker-app, Property 24: Recipe validation rejects invalid fields
// Feature: fitness-tracker-app, Property 25: Session date validation rejects future dates
import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import {
  validateWorkoutSet,
  validateWeightEntry,
  validateRecipe,
  validateSessionDate,
} from '../../utils/validation';

describe('validation property tests', () => {
  // Feature: fitness-tracker-app, Property 22: Workout set validation rejects invalid inputs
  // Validates: Requirements 21.1, 21.2, 21.3, 21.4
  it('Property 22: validateWorkoutSet rejects invalid weight or reps', () => {
    // Invalid weight: <= 0 or > 500
    const arbInvalidWeight = fc.oneof(
      fc.float({ min: Math.fround(-1000), max: 0, noNaN: true }),
      fc.float({ min: Math.fround(500.1), max: Math.fround(10000), noNaN: true }),
    );
    const arbValidReps = fc.integer({ min: 1, max: 99 });

    fc.assert(
      fc.property(arbInvalidWeight, arbValidReps, (weight, reps) => {
        const result = validateWorkoutSet(weight, reps);
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );

    // Invalid reps: non-positive integer or > 99
    const arbValidWeight = fc.float({ min: Math.fround(0.1), max: Math.fround(500), noNaN: true });
    const arbInvalidReps = fc.oneof(
      fc.integer({ min: -1000, max: 0 }),
      fc.integer({ min: 100, max: 10000 }),
      fc.float({ min: Math.fround(0.1), max: Math.fround(98.9), noNaN: true }).filter(n => !Number.isInteger(n)),
    );

    fc.assert(
      fc.property(arbValidWeight, arbInvalidReps, (weight, reps) => {
        const result = validateWorkoutSet(weight, reps);
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 23: Weight entry validation rejects non-positive values
  // Validates: Requirements 21.5
  it('Property 23: validateWeightEntry rejects values <= 0', () => {
    const arbNonPositive = fc.oneof(
      fc.float({ min: Math.fround(-10000), max: 0, noNaN: true }),
      fc.constant(0),
    );

    fc.assert(
      fc.property(arbNonPositive, (value) => {
        const result = validateWeightEntry(value);
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 24: Recipe validation rejects invalid fields
  // Validates: Requirements 21.6, 21.7, 21.8
  it('Property 24: validateRecipe rejects invalid name, calories, or macros', () => {
    const arbValidMacro = fc.float({ min: 0, max: Math.fround(1000), noNaN: true });
    const arbValidCalories = fc.integer({ min: 0, max: 5000 });

    // Invalid name: empty or all-whitespace
    const arbInvalidName = fc.oneof(
      fc.constant(''),
      fc.constant('   '),
    );

    fc.assert(
      fc.property(arbInvalidName, arbValidCalories, arbValidMacro, arbValidMacro, arbValidMacro, (name, calories, protein, carbs, fat) => {
        const result = validateRecipe({ name, calories, protein, carbs, fat });
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );

    // Invalid calories: negative
    const arbNegativeCalories = fc.integer({ min: -10000, max: -1 });
    fc.assert(
      fc.property(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), arbNegativeCalories, arbValidMacro, arbValidMacro, arbValidMacro, (name, calories, protein, carbs, fat) => {
        const result = validateRecipe({ name, calories, protein, carbs, fat });
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );

    // Invalid calories: non-integer
    const arbNonIntCalories = fc.float({ min: Math.fround(0.1), max: Math.fround(5000), noNaN: true }).filter(n => !Number.isInteger(n));
    fc.assert(
      fc.property(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), arbNonIntCalories, arbValidMacro, arbValidMacro, arbValidMacro, (name, calories, protein, carbs, fat) => {
        const result = validateRecipe({ name, calories, protein, carbs, fat });
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );

    // Invalid macros: negative protein/carbs/fat
    const arbNegativeMacro = fc.float({ min: Math.fround(-1000), max: Math.fround(-0.001), noNaN: true });
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        arbValidCalories,
        fc.oneof(
          fc.tuple(arbNegativeMacro, arbValidMacro, arbValidMacro),
          fc.tuple(arbValidMacro, arbNegativeMacro, arbValidMacro),
          fc.tuple(arbValidMacro, arbValidMacro, arbNegativeMacro),
        ),
        (name, calories, [protein, carbs, fat]) => {
          const result = validateRecipe({ name, calories, protein, carbs, fat });
          expect(result.valid).toBe(false);
          if (!result.valid) expect(result.error.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 25: Session date validation rejects future dates
  // Validates: Requirements 21.9
  it('Property 25: validateSessionDate rejects future dates', () => {
    const arbFutureDate = fc
      .tuple(
        fc.integer({ min: 2025, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
      )
      .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
      .filter(date => date > new Date().toISOString().split('T')[0]);

    fc.assert(
      fc.property(arbFutureDate, (date) => {
        const result = validateSessionDate(date);
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
