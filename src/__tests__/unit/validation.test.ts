import { describe, it, expect } from '@jest/globals';
import {
  validateWorkoutSet,
  validateWeightEntry,
  validateRecipe,
  validateSessionDate,
} from '../../utils/validation';

describe('validateWorkoutSet', () => {
  it('rejects weight = 0', () => {
    const r = validateWorkoutSet(0, 10);
    expect(r.valid).toBe(false);
  });

  it('accepts weight = 500', () => {
    const r = validateWorkoutSet(500, 10);
    expect(r.valid).toBe(true);
  });

  it('rejects weight = 501', () => {
    const r = validateWorkoutSet(501, 10);
    expect(r.valid).toBe(false);
  });

  it('rejects reps = 0', () => {
    const r = validateWorkoutSet(100, 0);
    expect(r.valid).toBe(false);
  });

  it('accepts reps = 99', () => {
    const r = validateWorkoutSet(100, 99);
    expect(r.valid).toBe(true);
  });

  it('rejects reps = 100', () => {
    const r = validateWorkoutSet(100, 100);
    expect(r.valid).toBe(false);
  });

  it('rejects non-integer reps', () => {
    const r = validateWorkoutSet(100, 5.5);
    expect(r.valid).toBe(false);
  });

  it('accepts valid set', () => {
    const r = validateWorkoutSet(80, 8);
    expect(r.valid).toBe(true);
  });
});

describe('validateWeightEntry', () => {
  it('rejects value = 0', () => {
    const r = validateWeightEntry(0);
    expect(r.valid).toBe(false);
  });

  it('rejects negative value', () => {
    const r = validateWeightEntry(-5);
    expect(r.valid).toBe(false);
  });

  it('accepts positive value', () => {
    const r = validateWeightEntry(70);
    expect(r.valid).toBe(true);
  });
});

describe('validateRecipe', () => {
  const valid = { name: 'Chicken', calories: 200, protein: 30, carbs: 5, fat: 4 };

  it('rejects empty name', () => {
    const r = validateRecipe({ ...valid, name: '' });
    expect(r.valid).toBe(false);
  });

  it('rejects whitespace-only name', () => {
    const r = validateRecipe({ ...valid, name: '   ' });
    expect(r.valid).toBe(false);
  });

  it('rejects negative calories', () => {
    const r = validateRecipe({ ...valid, calories: -1 });
    expect(r.valid).toBe(false);
  });

  it('rejects non-integer calories', () => {
    const r = validateRecipe({ ...valid, calories: 200.5 });
    expect(r.valid).toBe(false);
  });

  it('rejects negative protein', () => {
    const r = validateRecipe({ ...valid, protein: -1 });
    expect(r.valid).toBe(false);
  });

  it('rejects negative carbs', () => {
    const r = validateRecipe({ ...valid, carbs: -1 });
    expect(r.valid).toBe(false);
  });

  it('rejects negative fat', () => {
    const r = validateRecipe({ ...valid, fat: -1 });
    expect(r.valid).toBe(false);
  });

  it('accepts valid recipe', () => {
    const r = validateRecipe(valid);
    expect(r.valid).toBe(true);
  });

  it('accepts zero calories', () => {
    const r = validateRecipe({ ...valid, calories: 0 });
    expect(r.valid).toBe(true);
  });
});

describe('validateSessionDate', () => {
  it('accepts today', () => {
    const today = new Date().toISOString().split('T')[0];
    const r = validateSessionDate(today);
    expect(r.valid).toBe(true);
  });

  it('accepts yesterday', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    const r = validateSessionDate(yesterday);
    expect(r.valid).toBe(true);
  });

  it('rejects tomorrow', () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrow = d.toISOString().split('T')[0];
    const r = validateSessionDate(tomorrow);
    expect(r.valid).toBe(false);
  });
});
