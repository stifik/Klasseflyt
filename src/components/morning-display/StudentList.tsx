'use client';

import { useEffect, useRef } from 'react';

type StudentStatus = 'waiting' | 'checked-in' | 'absent';

type Student = {
  id: number;
  name: string;
  points: number;
  status: StudentStatus;
};

type StudentListProps = {
  students: Student[];
};

export default function StudentList({ students }: StudentListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Sort students alphabetically by first name
  const sortedStudents = [...students].sort((a, b) => 
    a.name.localeCompare(b.name, 'nb-NO')
  );

  // Update data-count attribute when student count changes
  useEffect(() => {
    if (listRef.current) {
      const studentCount = sortedStudents.length;
      listRef.current.setAttribute('data-count', studentCount.toString());
      
      // Adjust grid columns for small student counts
      if (studentCount <= 10) {
        listRef.current.style.gridTemplateColumns = '1fr';
      } else {
        listRef.current.style.gridTemplateColumns = '1fr 1fr';
      }
      
      // Adjust gap based on student count
      if (studentCount >= 25) {
        listRef.current.style.gap = '6px 10px';
      } else if (studentCount >= 20) {
        listRef.current.style.gap = '7px 11px';
      } else {
        listRef.current.style.gap = '8px 12px';
      }
    }
  }, [sortedStudents.length]);

  return (
    <div ref={listRef} className="student-list" data-count={sortedStudents.length}>
      {sortedStudents.map((student) => (
        <div
          key={student.id}
          className={`student-card student-card-${student.status}`}
        >
          <span className="student-name">{student.name}</span>
          <span className="student-points">{student.points}p</span>
        </div>
      ))}
    </div>
  );
}
