export type Reward = {
  id: number;
  name: string;
  cost: number;
};

export const rewards: Reward[] = [
  { id: 1, name: '15 min spilletid', cost: 20 },
  { id: 2, name: 'Velge aktivitet', cost: 30 },
  { id: 3, name: 'Hjemmeleksefri', cost: 50 },
];
