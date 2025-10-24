'use client';

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
  // Sort students alphabetically by first name
  const sortedStudents = [...students].sort((a, b) => 
    a.name.localeCompare(b.name, 'nb-NO')
  );

  return (
    <div className="student-list">
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
