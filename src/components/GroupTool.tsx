
"use client";

import { useState } from "react";
import type { Student } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Shuffle, Users } from "lucide-react";

interface GroupToolProps {
  students: Student[];
}

type GroupingStrategy = "numberOfGroups" | "studentsPerGroup";

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function GroupTool({ students }: GroupToolProps) {
  const [strategy, setStrategy] = useState<GroupingStrategy>("numberOfGroups");
  const [groupValue, setGroupValue] = useState<number>(4);
  const [generatedGroups, setGeneratedGroups] = useState<Student[][]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);

  const handleGenerateGroups = () => {
    if (groupValue <= 0 || students.length === 0) {
      setGeneratedGroups([]);
      setUnassignedStudents([]);
      return;
    }

    const shuffledStudents = shuffleArray(students);
    const groups: Student[][] = [];
    let remainingStudents = [...shuffledStudents];

    if (strategy === "numberOfGroups") {
      const numGroups = Math.min(groupValue, shuffledStudents.length);
      for (let i = 0; i < numGroups; i++) {
        groups.push([]);
      }
      shuffledStudents.forEach((student, index) => {
        groups[index % numGroups].push(student);
      });
      setUnassignedStudents([]);
    } else { // studentsPerGroup
      const numStudentsPerGroup = groupValue;
      const numGroups = Math.floor(shuffledStudents.length / numStudentsPerGroup);
      for (let i = 0; i < numGroups; i++) {
        groups.push(remainingStudents.splice(0, numStudentsPerGroup));
      }
      setUnassignedStudents(remainingStudents);
    }

    setGeneratedGroups(groups);
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Gruppegenerator</CardTitle>
            <CardDescription>
              Lag tilfeldige grupper basert på antall grupper eller elever per gruppe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={strategy} onValueChange={(value) => setStrategy(value as GroupingStrategy)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="numberOfGroups" id="r1" />
                <Label htmlFor="r1">Antall grupper</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="studentsPerGroup" id="r2" />
                <Label htmlFor="r2">Elever per gruppe</Label>
              </div>
            </RadioGroup>
            <div>
              <Label htmlFor="group-value">
                {strategy === "numberOfGroups" ? "Hvor mange grupper?" : "Hvor mange elever per gruppe?"}
              </Label>
              <Input
                id="group-value"
                type="number"
                min="1"
                value={groupValue}
                onChange={(e) => setGroupValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
            <Button onClick={handleGenerateGroups} className="w-full">
              <Shuffle className="mr-2" />
              Generer Grupper
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Resultat</CardTitle>
            <CardDescription>
              De genererte gruppene vil vises her.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedGroups.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {generatedGroups.map((group, index) => (
                  <Card key={index} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">Gruppe {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {group.map(student => (
                          <li key={student.id} className="flex items-center gap-2">
                             <Users className="w-4 h-4 text-muted-foreground" />
                             <span>{student.name}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
                {unassignedStudents.length > 0 && (
                   <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-lg">Elever uten gruppe</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {unassignedStudents.map(student => (
                          <li key={student.id} className="flex items-center gap-2">
                             <Users className="w-4 h-4 text-muted-foreground" />
                             <span>{student.name}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Ingen grupper generert ennå.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
