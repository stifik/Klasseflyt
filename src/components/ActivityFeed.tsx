"use client";

import React from "react";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity, Plus, Minus } from 'lucide-react';

function ActivityFeed() {
  // Hent de 5 siste transaksjonene, sortert på dato (nyeste først)
  const recentTransactions = useLiveQuery(async () => {
    const transactions = await db.transactions
      .orderBy('date')
      .reverse()
      .limit(5)
      .toArray();
    
    // Få studentnavn for hver transaksjon
    const transactionsWithStudentNames = await Promise.all(
      transactions.map(async (transaction) => {
        const student = await db.students.get(transaction.studentId);

        return {
          ...transaction,
          studentName: student?.name || 'Ukjent elev'
        };
      })
    );
    
    return transactionsWithStudentNames;
  }) || [];

  const formatDate = (date: Date) => {
    const now = new Date();
    const transactionDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Akkurat nå';
    if (diffInMinutes < 60) return `${diffInMinutes} min siden`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} time${diffInHours !== 1 ? 'r' : ''} siden`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} dag${diffInDays !== 1 ? 'er' : ''} siden`;
    
    return transactionDate.toLocaleDateString('nb-NO');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Aktivitetsfeed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentTransactions.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            Ingen aktivitet ennå
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div 
                key={`${transaction.studentId}-${transaction.date.getTime()}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                {/* Ikon basert på om det er positive eller negative poeng */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  transaction.pointsChange > 0 
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {transaction.pointsChange > 0 ? (
                    <Plus className="w-4 h-4" />
                  ) : (
                    <Minus className="w-4 h-4" />
                  )}
                </div>
                
                {/* Transaksjonsinfo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {transaction.studentName}
                    </span>
                    <span className={`text-sm font-semibold ${
                      transaction.pointsChange > 0 ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {transaction.pointsChange > 0 ? '+' : ''}{transaction.pointsChange}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {transaction.description}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {formatDate(transaction.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default React.memo(ActivityFeed);