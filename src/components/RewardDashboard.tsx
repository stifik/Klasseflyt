"use client";

import React, { useState, useEffect } from "react";
import type { Student } from "@/lib/types";
import { givePoints, type RewardResult } from "@/lib/rewardService";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Nfc, Zap, BarChart3 } from 'lucide-react';
import { useNfc } from '@/hooks/useNfc';

export default function RewardDashboard() {
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const [showGiveDialog, setShowGiveDialog] = useState<string | null>(null);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsDesc, setPointsDesc] = useState("");
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

  const viewTransactionHistory = (studentId: string) => {
    // TODO: Navigate to transaction history for this student
    // This could open a modal or navigate to a detailed view
    console.log('View transaction history for student:', studentId);
    showNotification('Transaksjonshistorikk åpnet (TODO: implementer)', 'success');
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
                  <span className={isHighlighted ? 'font-bold text-blue-700 dark:text-blue-300' : ''}>
                    {student.name}
                  </span>
                </td>
                <td className="p-2 border">{student.points ?? 0}</td>
                <td className="p-2 border flex gap-2">
                  <button 
                    className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600" 
                    onClick={() => setShowGiveDialog(student.id!)}
                    title="Gi poeng"
                  >
                    +
                  </button>
                  <button 
                    className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 flex items-center gap-1" 
                    onClick={() => viewTransactionHistory(student.id!)}
                    title="Vis transaksjonshistorikk"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Historie
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Gi poeng dialog */}
      {showGiveDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow flex flex-col gap-2 min-w-[250px]">
            <h3 className="font-bold mb-2 text-gray-900 dark:text-white">
              Gi poeng til {students.find(s => s.id === showGiveDialog)?.name}
            </h3>
            <input
              type="number"
              className="border p-1 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Antall poeng"
              value={pointsAmount}
              onChange={e => setPointsAmount(Number(e.target.value))}
              min={1}
              autoFocus
            />
            <input
              type="text"
              className="border p-1 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Beskrivelse"
              value={pointsDesc}
              onChange={e => setPointsDesc(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <button 
                className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600" 
                onClick={() => handleGivePoints(showGiveDialog)}
              >
                Gi poeng
              </button>
              <button 
                className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white px-2 py-1 rounded hover:bg-gray-400 dark:hover:bg-gray-700" 
                onClick={() => setShowGiveDialog(null)}
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
