"use client";

import React, { useState } from "react";
import type { Student, PurchasedReward } from "@/lib/types";
import { rewards } from "@/lib/rewards";
import { givePoints, buyReward, redeemReward } from "@/lib/rewardService";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Gift } from 'lucide-react';

export default function RewardDashboard() {
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const purchasedRewards = useLiveQuery(() => db.purchasedRewards.toArray()) || [];
  const [showGiveDialog, setShowGiveDialog] = useState<string | null>(null);
  const [showBuyDialog, setShowBuyDialog] = useState<string | null>(null);
  const [viewingWalletFor, setViewingWalletFor] = useState<string | null>(null);
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

  const handleRedeemReward = async (purchaseId: string) => {
    const success = await redeemReward(purchaseId);
    if (success) {
      // Wallet will update automatically due to reactive queries
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
          {students.map(student => {
            const unusedRewards = purchasedRewards.filter(p => p.studentId === student.id && p.status === 'unused');
            return (
              <tr key={student.id}>
                <td className="p-2 border">
                  <div className="flex items-center gap-2">
                    <span>{student.name}</span>
                    {unusedRewards.length > 0 && (
                      <span 
                        onClick={() => setViewingWalletFor(student.id!)}
                        className="cursor-pointer text-orange-600 hover:text-orange-800 flex items-center gap-1"
                        title="Vis lommebok"
                      >
                        <Gift className="w-4 h-4" />
                        {unusedRewards.length}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-2 border">{student.points ?? 0}</td>
                <td className="p-2 border flex gap-2">
                  <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={() => setShowGiveDialog(student.id!)}>+</button>
                  <button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={() => setShowBuyDialog(student.id!)}>Kjøp</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Lommebok Modal */}
      {viewingWalletFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              Lommebok for {students.find(s => s.id === viewingWalletFor)?.name}
            </h3>
            <div className="space-y-3">
              {purchasedRewards
                .filter(p => p.studentId === viewingWalletFor && p.status === 'unused')
                .map(purchase => (
                  <div key={purchase.purchaseId} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{purchase.rewardName}</div>
                      <div className="text-sm text-gray-500">
                        Kjøpt: {new Date(purchase.purchaseDate).toLocaleDateString('nb-NO')}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRedeemReward(purchase.purchaseId)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      Løs inn
                    </button>
                  </div>
                ))}
              {purchasedRewards.filter(p => p.studentId === viewingWalletFor && p.status === 'unused').length === 0 && (
                <div className="text-gray-500 text-center py-4">Ingen ubrukte gavekort</div>
              )}
            </div>
            <button 
              onClick={() => setViewingWalletFor(null)}
              className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 w-full"
            >
              Lukk
            </button>
          </div>
        </div>
      )}

      {/* Gi poeng dialog */}
      {showGiveDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-4 rounded shadow flex flex-col gap-2 min-w-[250px]">
            <h3 className="font-bold mb-2">Gi poeng til {students.find(s => s.id === showGiveDialog)?.name}</h3>
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
              <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={() => handleGivePoints(showGiveDialog)}>Gi poeng</button>
              <button className="bg-gray-300 px-2 py-1 rounded" onClick={() => setShowGiveDialog(null)}>Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {/* Kjøp belønning dialog */}
      {showBuyDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-4 rounded shadow flex flex-col gap-2 min-w-[250px]">
            <h3 className="font-bold mb-2">Kjøp gavekort for {students.find(s => s.id === showBuyDialog)?.name}</h3>
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
              <button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={() => handleBuyReward(showBuyDialog)}>Kjøp gavekort</button>
              <button className="bg-gray-300 px-2 py-1 rounded" onClick={() => setShowBuyDialog(null)}>Avbryt</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
