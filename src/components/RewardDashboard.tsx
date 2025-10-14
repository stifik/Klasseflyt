"use client";

import React, { useState, useEffect } from "react";
import type { Student } from "@/lib/types";
import { givePoints, type RewardResult } from "@/lib/rewardService";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Nfc, Zap, BarChart3 } from 'lucide-react';
import { useNfc } from '@/hooks/useNfc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RewardDashboard() {
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const [showGiveDialog, setShowGiveDialog] = useState<string | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState<string | null>(null);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsDesc, setPointsDesc] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'points'; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  // Hent transaksjonshistorikk for valgt elev
  const studentTransactions = useLiveQuery(async () => {
    if (!showHistoryDialog) return [];
    
    // Prøv både string og number versjoner av studentId
    let transactions = await db.transactions
      .where('studentId')
      .equals(showHistoryDialog)
      .toArray();
    
    // Hvis ingen funnet som string, prøv som number (hvis studentId er numerisk)
    if (transactions.length === 0 && /^\d+$/.test(showHistoryDialog)) {
      const numericId = Number(showHistoryDialog);
      transactions = await db.transactions
        .where('studentId')
        .equals(numericId as any)
        .toArray();
    }
    
    // Hvis ingen funnet som number, prøv som string (hvis studentId er number)
    if (transactions.length === 0) {
      const stringId = String(showHistoryDialog);
      transactions = await db.transactions
        .where('studentId')
        .equals(stringId)
        .toArray();
    }
    
    console.log(`Found ${transactions.length} transactions for student ${showHistoryDialog}:`, transactions);
    
    // Sorter i minnet (nyeste først)
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [showHistoryDialog]) || [];

  // Check if NFC is enabled in settings
  const settings = useLiveQuery(() => db.settings.get('userSettings'));
  const nfcEnabled = settings?.nfcEnabled || false;

  // NFC hook (only use if enabled)
  const { isSupported, isScanning, lastRead, error, startScanning, stopScanning } = useNfc();

  // Håndter NFC-lesninger (only if NFC is enabled)
  useEffect(() => {
    if (nfcEnabled && lastRead) {
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
  }, [nfcEnabled, lastRead, students]);

  // Håndter NFC-feil (only if NFC is enabled)
  useEffect(() => {
    if (nfcEnabled && error) {
      showNotification(error, 'error');
    }
  }, [nfcEnabled, error]);

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
    setShowHistoryDialog(studentId);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('nb-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
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

  // Sortert liste
  const sortedStudents = React.useMemo(() => {
    let sortableItems = [...students];
    sortableItems.sort((a, b) => {
      const aValue = sortConfig.key === 'name' ? a.name : (a.points ?? 0);
      const bValue = sortConfig.key === 'name' ? b.name : (b.points ?? 0);
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableItems;
  }, [students, sortConfig]);

  const handleSort = (key: 'name' | 'points') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
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
      
      <CardHeader>
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Klassebank
          </CardTitle>
          
          {/* NFC-kontroller (only show if enabled in settings) */}
          {nfcEnabled && isSupported && (
            <button
              onClick={handleNFCToggle}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                isScanning 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              disabled={!isSupported}
            >
              {isScanning ? <Zap className="w-4 h-4" /> : <Nfc className="w-4 h-4" />}
              {isScanning ? 'Stopp' : 'Start'}
            </button>
          )}
        </div>
        
        {/* Sorterings-knapper */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSort('name')}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              sortConfig.key === 'name' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Navn {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('points')}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              sortConfig.key === 'points' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Poeng {sortConfig.key === 'points' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Kort-basert liste */}
        <div className="space-y-3">
        {sortedStudents.map(student => {
          const isHighlighted = highlightedStudentId === student.id;
          
          return (
            <div 
              key={student.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                isHighlighted 
                  ? 'bg-blue-50 dark:bg-blue-900/30 scale-105' 
                  : 'bg-gray-50 dark:bg-gray-800'
              }`}
            >
              <div className="flex-1">
                <span className={`font-medium ${isHighlighted ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                  {student.name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[60px] text-right">
                  {student.points ?? 0} pt
                </span>
                <div className="flex gap-2">
                  <button 
                    className="bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 transition-colors" 
                    onClick={() => setShowGiveDialog(student.id!)}
                    title="Gi poeng"
                  >
                    +
                  </button>
                  <button 
                    className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 flex items-center gap-1 transition-colors" 
                    onClick={() => viewTransactionHistory(student.id!)}
                    title="Vis transaksjonshistorikk"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Historie</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
              value={pointsAmount === 0 ? '' : pointsAmount}
              onChange={e => setPointsAmount(Number(e.target.value) || 0)}
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

      {/* Transaksjonshistorikk dialog */}
      {showHistoryDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Transaksjonshistorikk - {students.find(s => s.id === showHistoryDialog)?.name}
                </h3>
                <button 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" 
                  onClick={() => setShowHistoryDialog(null)}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {studentTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Ingen transaksjoner funnet for denne eleven.</p>
                  <p className="text-sm mt-2">Student ID: {showHistoryDialog}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Viser {studentTransactions.length} transaksjoner (inkludert positive og negative)
                  </div>
                  {studentTransactions.map((transaction, index) => (
                    <div 
                      key={transaction.id || index}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        transaction.pointsChange >= 0 
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                          : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            transaction.pointsChange >= 0 
                              ? 'text-green-700 dark:text-green-400' 
                              : 'text-red-700 dark:text-red-400'
                          }`}>
                            {transaction.pointsChange >= 0 ? '+' : ''}{transaction.pointsChange} poeng
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">•</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {transaction.description}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {formatDate(transaction.date)}
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${
                        transaction.pointsChange >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.pointsChange >= 0 ? '⬆️' : '⬇️'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Totalt {studentTransactions.length} transaksjoner
                </div>
                <button 
                  className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors" 
                  onClick={() => setShowHistoryDialog(null)}
                >
                  Lukk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  );
}
