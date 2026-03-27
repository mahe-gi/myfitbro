import { create } from 'zustand';
import type { WeightUnit } from '../types/db';
import { getSettings, updateWeightUnit } from '../db/settings';

interface SettingsState {
  weightUnit: WeightUnit;
  error: string | null;
  loadSettings: () => Promise<void>;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  weightUnit: 'kg',
  error: null,

  loadSettings: async () => {
    try {
      const settings = await getSettings();
      set({ weightUnit: settings.weight_unit, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load settings' });
    }
  },

  setWeightUnit: async (unit: WeightUnit) => {
    try {
      await updateWeightUnit(unit);
      set({ weightUnit: unit, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to update weight unit' });
    }
  },
}));
