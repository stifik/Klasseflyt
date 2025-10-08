"use client";

import React from "react";
import type { Student } from "@/lib/types";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export default function ProjectorLeaderboard() {
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const sorted = [...students].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h1 className="text-5xl font-bold mb-8">Leaderboard</h1>
      <div className="w-full max-w-2xl">
        {sorted.map((student, idx) => (
          <div
            key={student.id}
            className="flex justify-between items-center py-4 px-8 mb-4 rounded-lg shadow-lg bg-gray-100"
            style={{ fontSize: '2rem' }}
          >
            <span className="font-bold">{idx + 1}. {student.name}</span>
            <span className="text-blue-700 font-extrabold">{student.points ?? 0} poeng</span>
          </div>
        ))}
      </div>
    </div>
  );
}
