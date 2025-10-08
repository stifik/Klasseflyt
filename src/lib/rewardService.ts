import { rewards } from "./rewards";
import { transactions, Transaction } from "./transactions";
import type { Student } from "./types";

// Anta at students er en global/eksportert liste et sted i appen
// Her bruker vi en placeholder som må byttes ut med faktisk student-liste i appen
export let students: Student[] = [];

// Funksjon for å gi poeng til en elev
export function givePoints(studentId: string, amount: number, description: string) {
  const student = students.find(s => s.id === studentId);
  if (!student) return;
  student.points = (student.points || 0) + amount;
  const newId = transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1;
  transactions.push({
    id: newId,
    studentId,
    date: new Date(),
    pointsChange: amount,
    description,
  });
}

// Funksjon for å bruke poeng på en belønning
export function buyReward(studentId: string, rewardId: number): boolean {
  const reward = rewards.find(r => r.id === rewardId);
  if (!reward) return false;
  const student = students.find(s => s.id === studentId);
  if (!student) return false;
  if ((student.points || 0) < reward.cost) return false;
  student.points = (student.points || 0) - reward.cost;
  const newId = transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1;
  transactions.push({
    id: newId,
    studentId,
    date: new Date(),
    pointsChange: -reward.cost,
    description: `Kjøpte '${reward.name}'`,
  });
  return true;
}
