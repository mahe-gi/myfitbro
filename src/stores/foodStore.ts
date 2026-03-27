import { create } from 'zustand';
import type { Recipe, FoodLog } from '../types/db';
import {
  getAllRecipes,
  createRecipe as dbCreateRecipe,
  updateRecipe as dbUpdateRecipe,
  deleteRecipe as dbDeleteRecipe,
} from '../db/recipes';
import {
  addFoodLogEntry,
  deleteFoodLogEntry,
  getFoodLogForDate,
  getDailyMacros,
} from '../db/foodLog';
import { validateRecipe } from '../utils/validation';

interface DailyMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodState {
  recipes: Recipe[];
  foodLog: (FoodLog & Recipe)[];
  dailyMacros: DailyMacros;
  error: string | null;

  loadRecipes: () => Promise<void>;
  createRecipe: (r: Omit<Recipe, 'id'>) => Promise<void>;
  updateRecipe: (id: number, r: Omit<Recipe, 'id'>) => Promise<void>;
  deleteRecipe: (id: number) => Promise<void>;
  addFoodLog: (entry: Omit<FoodLog, 'id' | 'created_at'>) => Promise<void>;
  deleteFoodLog: (id: number, date: string) => Promise<void>;
  loadFoodLogForDate: (date: string) => Promise<void>;
}

const DEFAULT_MACROS: DailyMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export const useFoodStore = create<FoodState>((set) => ({
  recipes: [],
  foodLog: [],
  dailyMacros: DEFAULT_MACROS,
  error: null,

  loadRecipes: async () => {
    try {
      const recipes = await getAllRecipes();
      set({ recipes, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load recipes' });
    }
  },

  createRecipe: async (r: Omit<Recipe, 'id'>) => {
    const validation = validateRecipe(r);
    if (!validation.valid) {
      set({ error: validation.error });
      return;
    }
    try {
      await dbCreateRecipe(r);
      const recipes = await getAllRecipes();
      set({ recipes, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create recipe' });
    }
  },

  updateRecipe: async (id: number, r: Omit<Recipe, 'id'>) => {
    const validation = validateRecipe(r);
    if (!validation.valid) {
      set({ error: validation.error });
      return;
    }
    try {
      await dbUpdateRecipe(id, r);
      const recipes = await getAllRecipes();
      set({ recipes, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to update recipe' });
    }
  },

  deleteRecipe: async (id: number) => {
    try {
      await dbDeleteRecipe(id);
      const recipes = await getAllRecipes();
      set({ recipes, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete recipe' });
    }
  },

  addFoodLog: async (entry: Omit<FoodLog, 'id' | 'created_at'>) => {
    try {
      await addFoodLogEntry(entry);
      const [foodLog, dailyMacros] = await Promise.all([
        getFoodLogForDate(entry.date),
        getDailyMacros(entry.date),
      ]);
      set({ foodLog, dailyMacros, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to add food log entry' });
    }
  },

  deleteFoodLog: async (id: number, date: string) => {
    try {
      await deleteFoodLogEntry(id);
      const [foodLog, dailyMacros] = await Promise.all([
        getFoodLogForDate(date),
        getDailyMacros(date),
      ]);
      set({ foodLog, dailyMacros, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete food log entry' });
    }
  },

  loadFoodLogForDate: async (date: string) => {
    try {
      const [foodLog, dailyMacros] = await Promise.all([
        getFoodLogForDate(date),
        getDailyMacros(date),
      ]);
      set({ foodLog, dailyMacros, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load food log' });
    }
  },
}));
