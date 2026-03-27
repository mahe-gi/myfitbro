import { create } from 'zustand';
import type { Exercise, WorkoutSet, ExercisePR } from '../types/db';
import type { OverloadSuggestion } from '../utils/progressiveOverload';
import { getAllExercises } from '../db/exercises';
import { getSessionsForDate, createSession } from '../db/sessions';
import { insertSet, updateSet, deleteSet as dbDeleteSet, getSetsForSession } from '../db/sets';
import { getPR, upsertPR, recomputePR } from '../db/pr';
import { validateWorkoutSet } from '../utils/validation';
import { evaluateOverload } from '../utils/progressiveOverload';

interface WorkoutState {
  currentSessionId: number | null;
  sets: WorkoutSet[];
  exercises: Exercise[];
  prs: Record<number, ExercisePR>;
  suggestion: OverloadSuggestion | null;
  error: string | null;

  loadExercises: () => Promise<void>;
  startOrGetSession: (date: string) => Promise<void>;
  logSet: (set: Omit<WorkoutSet, 'id' | 'created_at'>) => Promise<void>;
  editSet: (id: number, weight: number, reps: number, exerciseId: number) => Promise<void>;
  deleteSet: (id: number, exerciseId: number, weight: number) => Promise<void>;
  loadSetsForSession: (sessionId: number) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  currentSessionId: null,
  sets: [],
  exercises: [],
  prs: {},
  suggestion: null,
  error: null,

  loadExercises: async () => {
    try {
      const exercises = await getAllExercises();
      set({ exercises, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load exercises' });
    }
  },

  startOrGetSession: async (date: string) => {
    try {
      const sessions = await getSessionsForDate(date);
      let sessionId: number;
      if (sessions.length > 0) {
        sessionId = sessions[0].id;
      } else {
        sessionId = await createSession(date);
      }
      const sets = await getSetsForSession(sessionId);
      set({ currentSessionId: sessionId, sets, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to start session' });
    }
  },

  logSet: async (newSet: Omit<WorkoutSet, 'id' | 'created_at'>) => {
    const validation = validateWorkoutSet(newSet.weight, newSet.reps);
    if (!validation.valid) {
      set({ error: validation.error });
      return;
    }
    try {
      await insertSet(newSet);

      const currentPR = await getPR(newSet.exercise_id);
      if (!currentPR || newSet.weight > currentPR.max_weight) {
        await upsertPR(newSet.exercise_id, newSet.weight);
      }

      const updatedPR = await getPR(newSet.exercise_id);
      const { currentSessionId, prs } = get();
      const updatedPRs = { ...prs };
      if (updatedPR) {
        updatedPRs[newSet.exercise_id] = updatedPR;
      }

      const sets = currentSessionId ? await getSetsForSession(currentSessionId) : [];
      const exerciseSets = sets.filter(s => s.exercise_id === newSet.exercise_id);
      const suggestion = evaluateOverload(exerciseSets, newSet.exercise_id);

      set({ sets, prs: updatedPRs, suggestion, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to log set' });
    }
  },

  editSet: async (id: number, weight: number, reps: number, exerciseId: number) => {
    const validation = validateWorkoutSet(weight, reps);
    if (!validation.valid) {
      set({ error: validation.error });
      return;
    }
    try {
      const { sets, currentSessionId, prs } = get();
      const oldSet = sets.find(s => s.id === id);
      const oldWeight = oldSet?.weight ?? 0;

      await updateSet(id, weight, reps);

      const currentPR = await getPR(exerciseId);
      if (!currentPR || weight > currentPR.max_weight) {
        await upsertPR(exerciseId, weight);
      } else if (currentPR && oldWeight === currentPR.max_weight && weight < oldWeight) {
        await recomputePR(exerciseId);
      }

      const updatedPR = await getPR(exerciseId);
      const updatedPRs = { ...prs };
      if (updatedPR) {
        updatedPRs[exerciseId] = updatedPR;
      } else {
        delete updatedPRs[exerciseId];
      }

      const updatedSets = currentSessionId ? await getSetsForSession(currentSessionId) : [];
      set({ sets: updatedSets, prs: updatedPRs, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to edit set' });
    }
  },

  deleteSet: async (id: number, exerciseId: number, weight: number) => {
    try {
      const { currentSessionId, prs } = get();
      const currentPR = await getPR(exerciseId);

      await dbDeleteSet(id);

      if (currentPR && weight === currentPR.max_weight) {
        await recomputePR(exerciseId);
      }

      const updatedPR = await getPR(exerciseId);
      const updatedPRs = { ...prs };
      if (updatedPR) {
        updatedPRs[exerciseId] = updatedPR;
      } else {
        delete updatedPRs[exerciseId];
      }

      const updatedSets = currentSessionId ? await getSetsForSession(currentSessionId) : [];
      set({ sets: updatedSets, prs: updatedPRs, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete set' });
    }
  },

  loadSetsForSession: async (sessionId: number) => {
    try {
      const sets = await getSetsForSession(sessionId);
      set({ sets, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load sets' });
    }
  },
}));
