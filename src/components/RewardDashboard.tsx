"use client";

import React, { useState } from "react";
import type { Student } from "@/lib/types";
import { rewards } from "@/lib/rewards";
import { givePoints, buyReward } from "@/lib/rewardService";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export default function RewardDashboard() {
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const [showGiveDialog, setShowGiveDialog] = useState<string | null>(null);
  const [showBuyDialog, setShowBuyDialog] = useState<string | null>(null);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsDesc, setPointsDesc] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState<number | null>(null);

  const handleGivePoints = async (studentId: string) => {
    if (pointsAmount > 0 && pointsDesc) {
      const success = await givePoints(studentId, pointsAmount, pointsDesc);
      if (success) {
        setShowGiveDialog(null);
        setPointsAmount(0);
        setPointsDesc("");
      }
    }
  };

  const handleBuyReward = async (studentId: string) => {
    if (selectedRewardId) {
      const success = await buyReward(studentId, selectedRewardId);
      if (success) {
        setShowBuyDialog(null);
        setSelectedRewardId(null);
      }
    }
  };

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
                <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={() => setShowGiveDialog(student.id!)}>+</button>
                <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => setShowBuyDialog(student.id!)}>-</button>
                <button className="bg-gray-300 text-black px-2 py-1 rounded">Historikk</button>
                {/* Gi poeng dialog */}
                {showGiveDialog === student.id && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                    <div className="bg-white p-4 rounded shadow flex flex-col gap-2 min-w-[250px]">
                      <h3 className="font-bold mb-2">Gi poeng til {student.name}</h3>
                      <input
                        type="number"
                        className="border p-1 rounded"
                        placeholder="Antall poeng"
                        value={pointsAmount}
                        onChange={e => setPointsAmount(Number(e.target.value))}
                        min={1}
                        autoFocus
                      />
                      <input
                        type="text"
                        className="border p-1 rounded"
                        placeholder="Beskrivelse"
                        value={pointsDesc}
                        onChange={e => setPointsDesc(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={() => handleGivePoints(student.id!)}>Gi poeng</button>
                        <button className="bg-gray-300 px-2 py-1 rounded" onClick={() => setShowGiveDialog(null)}>Avbryt</button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Kjøp belønning dialog */}
                {showBuyDialog === student.id && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                    <div className="bg-white p-4 rounded shadow flex flex-col gap-2 min-w-[250px]">
                      <h3 className="font-bold mb-2">Bruk poeng for {student.name}</h3>
                      <select
                        className="border p-1 rounded"
                        value={selectedRewardId ?? ''}
                        onChange={e => setSelectedRewardId(Number(e.target.value))}
                      >
                        <option value="" disabled>Velg belønning</option>
                        {rewards.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.cost} poeng)</option>
                        ))}
                      </select>
                      <div className="flex gap-2 mt-2">
                        <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => handleBuyReward(student.id!)}>Kjøp</button>
                        <button className="bg-gray-300 px-2 py-1 rounded" onClick={() => setShowBuyDialog(null)}>Avbryt</button>
                      </div>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
