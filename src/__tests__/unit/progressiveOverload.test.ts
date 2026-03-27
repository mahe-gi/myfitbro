import { describe, it, expect } from '@jest/globals';
import { evaluateOverload } from '../../utils/progressiveOverload';
import type { WorkoutSet } from '../../types/db';

function makeSets(repsArray: number[]): WorkoutSet[] {
  return repsArray.map((reps, i) => ({
    id: i + 1,
    workout_session_id: 1,
    exercise_id: 1,
    weight: 60,
    reps,
    created_at: new Date().toISOString(),
  }));
}

describe('evaluateOverload', () => {
  it('returns null for empty sets array', () => {
    expect(evaluateOverload([], 1, 8, 12)).toBeNull();
  });

  it('returns increase when max reps equals maxReps threshold', () => {
    const sets = makeSets([8, 10, 12]);
    const result = evaluateOverload(sets, 1, 8, 12);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('increase');
  });

  it('returns increase when max reps exceeds maxReps threshold', () => {
    const sets = makeSets([6, 8, 15]);
    const result = evaluateOverload(sets, 1, 8, 12);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('increase');
  });

  it('returns decrease when average reps is below minReps threshold', () => {
    const sets = makeSets([4, 5, 6]); // avg = 5, below minReps=8
    const result = evaluateOverload(sets, 1, 8, 12);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('decrease');
  });

  it('returns null when reps are in range', () => {
    const sets = makeSets([9, 10, 11]); // avg=10, max=11, both in [8,12)
    const result = evaluateOverload(sets, 1, 8, 12);
    expect(result).toBeNull();
  });

  it('includes exerciseId in suggestion', () => {
    const sets = makeSets([12]);
    const result = evaluateOverload(sets, 42, 8, 12);
    expect(result!.exerciseId).toBe(42);
  });

  it('returns decrease with single set below minReps', () => {
    const sets = makeSets([3]);
    const result = evaluateOverload(sets, 1, 8, 12);
    expect(result!.type).toBe('decrease');
  });
});
