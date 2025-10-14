import type { Reward } from './types';

// Default rewards for initialization (moved to DB-driven model)
export const defaultRewards: Reward[] = [
  { id: 1, name: '15 min spilletid', cost: 20, basePrice: 20, currentPrice: 20 },
  { id: 2, name: 'Velge aktivitet', cost: 30, basePrice: 30, currentPrice: 30 },
  { id: 3, name: 'Hjemmeleksefri', cost: 50, basePrice: 50, currentPrice: 50 },
  { id: 4, name: 'Sitte hvor du vil', cost: 15, basePrice: 15, currentPrice: 15 },
  { id: 5, name: 'Spesialoppgave', cost: 40, basePrice: 40, currentPrice: 40 },
];
