export type PositiveAction = {
  id: number;
  name: string;
  points: number;
};

export const positiveActions: PositiveAction[] = [
  { id: 1, name: 'iPad ladet', points: 5 },
  { id: 2, name: 'God innsats', points: 10 },
  { id: 3, name: 'Hjalp en medelev', points: 15 },
  { id: 4, name: 'Kom i tide', points: 5 },
  { id: 5, name: 'Huket lekse', points: 10 },
  { id: 6, name: 'Deltok aktivt', points: 15 },
];