export type ValidationResult = { valid: true } | { valid: false; error: string };

export function validateWorkoutSet(weight: number, reps: number): ValidationResult {
  if (weight <= 0) return { valid: false, error: 'Weight must be greater than 0.' };
  if (weight > 500) return { valid: false, error: 'Weight must not exceed 500 kg.' };
  if (!Number.isInteger(reps) || reps <= 0) return { valid: false, error: 'Reps must be a positive integer.' };
  if (reps > 99) return { valid: false, error: 'Reps must not exceed 99.' };
  return { valid: true };
}

export function validateWeightEntry(value: number): ValidationResult {
  if (value <= 0) return { valid: false, error: 'Weight must be greater than 0.' };
  return { valid: true };
}

export function validateRecipe(r: {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): ValidationResult {
  if (!r.name || r.name.trim().length === 0) return { valid: false, error: 'Recipe name must not be empty.' };
  if (r.calories < 0) return { valid: false, error: 'Calories must be 0 or greater.' };
  if (!Number.isInteger(r.calories)) return { valid: false, error: 'Calories must be a whole number.' };
  if (r.protein < 0) return { valid: false, error: 'Protein must be 0 or greater.' };
  if (r.carbs < 0) return { valid: false, error: 'Carbs must be 0 or greater.' };
  if (r.fat < 0) return { valid: false, error: 'Fat must be 0 or greater.' };
  return { valid: true };
}

export function validateSessionDate(date: string): ValidationResult {
  const today = new Date().toISOString().split('T')[0];
  if (date > today) return { valid: false, error: 'Session date cannot be in the future.' };
  return { valid: true };
}
