export type Transaction = {
  id: number;
  studentId: string;
  date: Date;
  pointsChange: number;
  description: string;
};

export const transactions: Transaction[] = [
  {
    id: 1,
    studentId: '1',
    date: new Date('2025-10-08T09:00:00Z'),
    pointsChange: 10,
    description: 'God innsats i timen',
  },
  {
    id: 2,
    studentId: '2',
    date: new Date('2025-10-08T10:00:00Z'),
    pointsChange: -20,
    description: 'Kjøp: 15 min spilletid',
  },
];
