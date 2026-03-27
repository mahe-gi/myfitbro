import type {
  Exercise,
  WorkoutSession,
  WorkoutSet,
  ExercisePR,
  WeightEntry,
  Recipe,
  FoodLog,
  UserSettings,
} from './db';

export interface BackupPayload {
  version: 1;
  exported_at: string;
  exercises: Exercise[];
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
  prs: ExercisePR[];
  weight_entries: WeightEntry[];
  recipes: Recipe[];
  food_logs: FoodLog[];
  settings: UserSettings;
}
