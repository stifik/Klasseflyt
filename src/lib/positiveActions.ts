export type PositiveAction = {
  id: number;
  name: string;
  points: number;
  type: 'system' | 'manual';
  actionKey?: 'IPAD_CHARGED' | 'HOMEWORK_APPROVED' | 'SECRET_AGENT_PASSED';
  emoji?: string;
};

export const positiveActions: PositiveAction[] = [
  // System-handlinger (styres av appen, kun poeng kan endres)
  { id: 1, name: 'iPad ladet og klar', points: 5, type: 'system', actionKey: 'IPAD_CHARGED', emoji: '🔋' },
  { id: 2, name: 'Godkjent lekse', points: 10, type: 'system', actionKey: 'HOMEWORK_APPROVED', emoji: '📚' },
  { id: 7, name: 'Hemmelig Agent - Oppdrag fullført', points: 50, type: 'system', actionKey: 'SECRET_AGENT_PASSED', emoji: '🕵️' },

  // Manuelle handlinger (kan legges til/slettes av brukeren)
  { id: 3, name: 'God innsats i timen', points: 10, type: 'manual', emoji: '💪' },
  { id: 4, name: 'Hjalp en medelev', points: 15, type: 'manual', emoji: '🤝' },
  { id: 5, name: 'Kom i tide', points: 5, type: 'manual', emoji: '⏰' },
  { id: 6, name: 'Deltok aktivt', points: 15, type: 'manual', emoji: '🙋' },
];