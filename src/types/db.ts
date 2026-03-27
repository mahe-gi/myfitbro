export type WeightUnit = 'kg' | 'lbs';
export type MealCategory = 'Pre Workout' | 'Post Workout' | 'Lunch' | 'Dinner';

export interface Exercise {
  id: number;
  name: string;
  muscle: string;
}

export interface WorkoutSession {
  id: number;
  date: string; // ISO date string YYYY-MM-DD
  notes: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id: number;
  workout_session_id: number;
  exercise_id: number;
  weight: number; // always kg
  reps: number;
  created_at: string;
}

export interface ExercisePR {
  exercise_id: number;
  max_weight: number; // always kg
}

export interface WeightEntry {
  date: string; // ISO date string YYYY-MM-DD
  value: number; // always kg
}

export interface Recipe {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodLog {
  id: number;
  date: string;
  recipe_id: number;
  meal_category: MealCategory;
  created_at: string;
}

export interface UserSettings {
  id: 1;
  weight_unit: WeightUnit;
}
