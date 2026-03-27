import type { WorkoutSet } from '../types/db';

export interface OverloadSuggestion {
  type: 'increase' | 'decrease';
  exerciseId: number;
  message: string;
}

export function evaluateOverload(
  sets: WorkoutSet[],
  exerciseId: number,
  minReps: number = 8,
  maxReps: number = 12,
): OverloadSuggestion | null {
  if (sets.length === 0) return null;
  const repsValues = sets.map(s => s.reps);
  const maxRepsLogged = Math.max(...repsValues);
  const avgReps = repsValues.reduce((a, b) => a + b, 0) / repsValues.length;

  if (maxRepsLogged >= maxReps) {
    return { type: 'increase', exerciseId, message: `Hit ${maxRepsLogged} reps — consider increasing weight next session.` };
  }
  if (avgReps < minReps) {
    return { type: 'decrease', exerciseId, message: `Average ${avgReps.toFixed(1)} reps — consider reducing weight.` };
  }
  return null;
}
