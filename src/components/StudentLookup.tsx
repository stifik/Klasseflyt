
"use client";

import { useState, useMemo } from 'react';
import type { Student, Subject, Homework, Submission, DailyCheck, Remark, HomeworkStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface StudentLookupProps {
  students: Student[];
  subjects: Subject[];
  homework: Homework[];
  submissions: Submission[];
  dailyChecks: DailyCheck[];
  remarks: Remark[];
}

const statusVariantMap: Record<HomeworkStatus, "default" | "destructive" | "secondary" | "outline"> = {
    "Godkjent": "default",
    "Ikke levert": "destructive",
    "Må rettes": "secondary",
    "Syk/Fravær": "outline",
    "Glemt bok": "secondary",
};

export default function StudentLookup({ students, subjects, homework, submissions, dailyChecks, remarks }: StudentLookupProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const studentData = useMemo(() => {
    if (!selectedStudentId) return null;

    const studentSubmissions = submissions.filter(s => s.studentId === selectedStudentId);
    const studentChecks = dailyChecks.filter(c => c.studentId === selectedStudentId);
    const studentRemarks = remarks.filter(r => r.studentId === selectedStudentId);

    const homeworkDetails = studentSubmissions.map(sub => {
      const hw = homework.find(h => h.id === sub.homeworkId);
      const subject = subjects.find(s => s.id === hw?.subjectId);
      return {
        ...sub,
        homeworkTitle: hw?.title || "Ukjent lekse",
        subjectName: subject?.name || "Ukjent fag",
        date: hw?.date,
      };
    }).sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

    const ipadNotCharged = studentChecks.filter(c => c.ipadBrought && !c.ipadCharged);
    const ipadNotBrought = studentChecks.filter(c => !c.ipadBrought);

    const statusCounts = studentSubmissions.reduce((acc, sub) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
    }, {} as Record<HomeworkStatus, number>);

    return {
      homeworkDetails,
      ipadNotCharged,
      ipadNotBrought,
      remarks: studentRemarks.sort((a,b) => b.date.getTime() - a.date.getTime()),
      statusCounts,
    };
  }, [selectedStudentId, submissions, dailyChecks, remarks, homework, subjects]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Elevsøk</CardTitle>
          <CardDescription>Velg en elev for å se en samlet oversikt over lekser, iPad-ansvar og anmerkninger.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Velg en elev..." />
            </SelectTrigger>
            <SelectContent>
              {students.map(student => (
                <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedStudentId && studentData && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Leksehistorikk</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="flex flex-wrap gap-2 mb-4">
                        {Object.entries(studentData.statusCounts).map(([status, count]) => (
                            <Badge key={status} variant={statusVariantMap[status as HomeworkStatus]}>
                                {status}: {count}
                            </Badge>
                        ))}
                    </div>
                    <div className="max-h-96 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Dato</TableHead>
                                <TableHead>Fag</TableHead>
                                <TableHead>Lekse</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Kommentar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentData.homeworkDetails.map(hw => (
                                <TableRow key={hw.id}>
                                    <TableCell>{hw.date ? format(hw.date, "dd.MM.yy", {locale: nb}) : '-'}</TableCell>
                                    <TableCell>{hw.subjectName}</TableCell>
                                    <TableCell>{hw.homeworkTitle}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariantMap[hw.status]}>{hw.status}</Badge>
                                    </TableCell>
                                    <TableCell>{hw.comment}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
          </div>
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>iPad-ansvar</CardTitle>
              </CardHeader>
              <CardContent>
                <p><strong>Ikke ladet:</strong> {studentData.ipadNotCharged.length} gang(er)</p>
                <p><strong>Ikke medbrakt:</strong> {studentData.ipadNotBrought.length} gang(er)</p>
                {studentData.ipadNotCharged.length > 0 && (
                    <ul className="text-sm list-disc list-inside mt-2">
                        {studentData.ipadNotCharged.map(c => <li key={c.id}>{format(c.date, "PPP", {locale: nb})}</li>)}
                    </ul>
                )}
                 {studentData.ipadNotBrought.length > 0 && (
                    <ul className="text-sm list-disc list-inside mt-2">
                        {studentData.ipadNotBrought.map(c => <li key={c.id}>{format(c.date, "PPP", {locale: nb})}</li>)}
                    </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Anmerkninger</CardTitle>
              </CardHeader>
              <CardContent>
                <p><strong>Totalt antall:</strong> {studentData.remarks.length}</p>
                 {studentData.remarks.length > 0 && (
                    <ul className="text-sm list-disc list-inside mt-2">
                        {studentData.remarks.map(r => <li key={r.id}>{format(r.date, "PPP", {locale: nb})}</li>)}
                    </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
