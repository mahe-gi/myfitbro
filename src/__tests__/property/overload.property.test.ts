// Feature: fitness-tracker-app, Property 20: Progressive overload — increase suggestion
// Feature: fitness-tracker-app, Property 21: Progressive overload — decrease suggestion
import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { evaluateOverload } from '../../utils/progressiveOverload';
import type { WorkoutSet } from '../../types/db';

function makeSet(reps: number): WorkoutSet {
  return {
    id: 1,
    workout_session_id: 1,
    exercise_id: 1,
    weight: 60,
    reps,
    created_at: new Date().toISOString(),
  };
}

const MIN_REPS = 8;
const MAX_REPS = 12;

describe('progressive overload property tests', () => {
  // Feature: fitness-tracker-app, Property 20: Progressive overload — increase suggestion
  // Validates: Requirements 6.1
  it('Property 20: returns increase suggestion when max reps meets or exceeds maxReps', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: MAX_REPS - 1 }), { minLength: 0, maxLength: 5 }),
        fc.integer({ min: MAX_REPS, max: 50 }),
        (otherReps, highReps) => {
          const sets: WorkoutSet[] = [...otherReps, highReps].map(makeSet);
          const result = evaluateOverload(sets, 1, MIN_REPS, MAX_REPS);
          expect(result).not.toBeNull();
          expect(result!.type).toBe('increase');
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: fitness-tracker-app, Property 21: Progressive overload — decrease suggestion
  // Validates: Requirements 6.2
  it('Property 21: returns decrease suggestion when average reps is strictly less than minReps', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: MIN_REPS - 1 }), { minLength: 1, maxLength: 10 }),
        (repsArray) => {
          // Ensure max < maxReps so increase doesn't trigger first
          const cappedReps = repsArray.map(r => Math.min(r, MAX_REPS - 1));
          const avg = cappedReps.reduce((a, b) => a + b, 0) / cappedReps.length;
          // Only test when avg is strictly less than minReps
          fc.pre(avg < MIN_REPS);
          const sets: WorkoutSet[] = cappedReps.map(makeSet);
          const result = evaluateOverload(sets, 1, MIN_REPS, MAX_REPS);
          expect(result).not.toBeNull();
          expect(result!.type).toBe('decrease');
        },
      ),
      { numRuns: 100 },
    );
  });
});
