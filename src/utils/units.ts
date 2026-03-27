import type { WeightUnit } from '../types/db';

export type { WeightUnit };

const KG_TO_LBS = 2.20462;

export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  return unit === 'lbs' ? Math.round(kg * KG_TO_LBS * 10) / 10 : kg;
}

export function toStorageWeight(display: number, unit: WeightUnit): number {
  return unit === 'lbs' ? display / KG_TO_LBS : display;
}
