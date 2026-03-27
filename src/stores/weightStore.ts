import { create } from 'zustand';
import type { WeightEntry } from '../types/db';
import { upsertWeightEntry, getWeightHistory } from '../db/weight';
import { validateWeightEntry } from '../utils/validation';

interface WeightState {
  history: WeightEntry[];
  todayEntry: WeightEntry | null;
  error: string | null;

  logWeight: (date: string, value: number) => Promise<void>;
  loadHistory: () => Promise<void>;
}

export const useWeightStore = create<WeightState>((set) => ({
  history: [],
  todayEntry: null,
  error: null,

  logWeight: async (date: string, value: number) => {
    const validation = validateWeightEntry(value);
    if (!validation.valid) {
      set({ error: validation.error });
      return;
    }
    try {
      await upsertWeightEntry(date, value);
      const history = await getWeightHistory();
      const todayEntry = history.find(e => e.date === date) ?? null;
      set({ history, todayEntry, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to log weight' });
    }
  },

  loadHistory: async () => {
    try {
      const history = await getWeightHistory();
      set({ history, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load weight history' });
    }
  },
}));
