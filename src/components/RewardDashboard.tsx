"use client";

import React, { useState, useEffect } from "react";
import type { Student, PurchasedReward } from "@/lib/types";
import { rewards } from "@/lib/rewards";
import { givePoints, buyReward, redeemReward, type RewardResult } from "@/lib/rewardService";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Gift, Nfc, Zap } from 'lucide-react';
import { useNfc } from '@/hooks/useNfc';

export default function RewardDashboard() {
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const purchasedRewards = useLiveQuery(() => db.purchasedRewards.toArray()) || [];
  const [showGiveDialog, setShowGiveDialog] = useState<string | null>(null);
  const [showBuyDialog, setShowBuyDialog] = useState<string | null>(null);
  const [viewingWalletFor, setViewingWalletFor] = useState<string | null>(null);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsDesc, setPointsDesc] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);

  // NFC hook
  const { isSupported, isScanning, lastRead, error, startScanning, stopScanning } = useNfc();

  // Håndter NFC-lesninger
  useEffect(() => {
    if (lastRead) {
      // Prøv å finne elev basert på NFC-data
      const matchingStudent = students.find(student => {
        // Sjekk om NFC-data matcher elevens ID eller navn
        return student.id === lastRead || 
               student.name.toLowerCase().includes(lastRead.toLowerCase()) ||
               lastRead.toLowerCase().includes(student.name.toLowerCase());
      });

      if (matchingStudent) {
        setHighlightedStudentId(matchingStudent.id!);
        showNotification(`Elev funnet: ${matchingStudent.name}`, 'success');
        
        // Fjern highlighting etter 5 sekunder
        setTimeout(() => setHighlightedStudentId(null), 5000);
      } else {
        showNotification(`Ingen elev funnet for NFC-kort: ${lastRead}`, 'error');
      }
    }
  }, [lastRead, students]);

  // Håndter NFC-feil
  useEffect(() => {
    if (error) {
      showNotification(error, 'error');
    }
  }, [error]);

  // Vis notifikasjon i 3 sekunder
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleGivePoints = async (studentId: string) => {
    if (pointsAmount > 0 && pointsDesc) {
      const result = await givePoints(studentId, pointsAmount, pointsDesc);
      if (result.success) {
        setShowGiveDialog(null);
        setPointsAmount(0);
        setPointsDesc("");
        showNotification(result.message, 'success');
      } else {
        showNotification(result.message, 'error');
      }
    }
  };

  const handleBuyReward = async (studentId: string) => {
    if (selectedRewardId) {
      const result = await buyReward(studentId, selectedRewardId);
      if (result.success) {
        setShowBuyDialog(null);
        setSelectedRewardId(null);
        showNotification(result.message, 'success');
      } else {
        showNotification(result.message, 'error');
      }
    }
  };

  const handleRedeemReward = async (purchaseId: string) => {
    const result = await redeemReward(purchaseId);
    if (result.success) {
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleNFCToggle = async () => {
    if (isScanning) {
      stopScanning();
      showNotification('NFC-skanning stoppet', 'success');
    } else {
      const result = await startScanning();
      showNotification(result.message, result.success ? 'success' : 'error');
    }
  };

  return (
    <div className="relative">
      {/* Notifikasjon */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Klassebank</h2>
        
        {/* NFC-kontroller */}
        {isSupported && (
          <button
            onClick={handleNFCToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isScanning 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            disabled={!isSupported}
          >
            {isScanning ? <Zap className="w-4 h-4" /> : <Nfc className="w-4 h-4" />}
            {isScanning ? 'Stopp NFC' : 'Start NFC'}
          </button>
        )}
      </div>
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
            const isHighlighted = highlightedStudentId === student.id;
            
            return (
              <tr 
                key={student.id}
                className={`transition-colors ${
                  isHighlighted 
                    ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <td className="p-2 border">
                  <div className="flex items-center gap-2">
                    <span className={isHighlighted ? 'font-bold text-blue-700 dark:text-blue-300' : ''}>
                      {student.name}
                    </span>
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
