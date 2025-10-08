import React from "react";
import type { Student } from "@/lib/types";

// Denne listen må byttes ut med faktisk student-henting fra DB eller context i appen
declare const students: Student[];

export default function RewardDashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Klassebank</h2>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="p-2 border">Navn</th>
            <th className="p-2 border">Poeng</th>
            <th className="p-2 border">Handlinger</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id}>
              <td className="p-2 border">{student.name}</td>
              <td className="p-2 border">{student.points ?? 0}</td>
              <td className="p-2 border flex gap-2">
                <button className="bg-green-500 text-white px-2 py-1 rounded">+</button>
                <button className="bg-red-500 text-white px-2 py-1 rounded">-</button>
                <button className="bg-gray-300 text-black px-2 py-1 rounded">Historikk</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
