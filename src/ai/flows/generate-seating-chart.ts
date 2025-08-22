
'use server';

/**
 * @fileOverview A Genkit flow for generating seating charts for a classroom.
 *
 * - generateSeatingChart - A function that creates a seating arrangement based on classroom layout and student constraints.
 * - GenerateSeatingChartInput - The input type for the generateSeatingChart function.
 * - GenerateSeatingChartOutput - The return type for the generateSeatingChart function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateSeatingChartInputSchema = z.object({
  studentNames: z.array(z.string()).describe('A list of all student names in the class.'),
  rows: z.number().describe('The number of rows of desks in the classroom.'),
  cols: z.number().describe('The number of columns of desks in the classroom.'),
  groupSize: z.number().describe('The number of students that can sit at a single desk/table.'),
  avoidPairs: z
    .array(z.tuple([z.string(), z.string()]))
    .describe(
      'A list of pairs of student names who should not be seated at the same desk, or directly next to each other in the same group.'
    ),
});

export type GenerateSeatingChartInput = z.infer<typeof GenerateSeatingChartInputSchema>;

const GenerateSeatingChartOutputSchema = z.object({
  seatingChart: z
    .array(z.array(z.array(z.string()).nullable()))
    .describe(
      'A 2D array representing the seating chart. The outer array represents rows, the next array represents columns (desks), and the inner array contains the names of the students at that desk. A desk can be null if it is empty.'
    ),
});

export type GenerateSeatingChartOutput = z.infer<typeof GenerateSeatingChartOutputSchema>;

export async function generateSeatingChart(
  input: GenerateSeatingChartInput
): Promise<GenerateSeatingChartOutput> {
  return generateSeatingChartFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSeatingChartPrompt',
  input: { schema: GenerateSeatingChartInputSchema },
  output: { schema: GenerateSeatingChartOutputSchema },
  prompt: `You are a helpful assistant for a teacher. Your task is to create a new, random seating chart for a classroom. It is crucial that the seating chart is different and random each time this prompt is called.

Class details:
- Total students: {{studentNames.length}}
- Student names: {{#each studentNames}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Classroom layout: {{rows}} rows by {{cols}} columns of desks/tables.
- Group size per desk/table: {{groupSize}} students.

Constraints:
- The total number of desks is {{rows}} * {{cols}}.
- The total capacity is ({{rows}} * {{cols}}) * {{groupSize}}.
- The following pairs of students must NOT be seated directly next to each other at the same desk/table:
{{#if avoidPairs}}
{{#each avoidPairs}}
  - {{this.[0]}} and {{this.[1]}}
{{/each}}
{{else}}
  - No specific pairs to avoid.
{{/if}}

Please generate a completely new and random seating chart based on these details.
- Place all students from the list into the seating chart.
- If the total capacity is greater than the number of students, some desks will be empty. Represent empty desks with 'null' in the array.
- IMPORTANT: Groups of students should be kept together. Do not place a 'null' value for a single empty seat within a desk group that contains other students. A desk/group is either completely empty (represented as 'null') or contains only student names.
- It is very important that you respect the 'avoidPairs' constraints. Students in those pairs cannot be in the same group if it means they sit next to each other. For example, in a group of 3 (A, B, C), if (A, B) is an avoid pair, A and B cannot sit next to each other, but A and C could be in the same group if B is not between them. The students are seated in the order they appear in the array.
- The final output must be a 2D array of size {{rows}} x {{cols}}, where each cell contains an array of student names (up to groupSize) or is null if the desk is empty.
`,
});

const generateSeatingChartFlow = ai.defineFlow(
  {
    name: 'generateSeatingChartFlow',
    inputSchema: GenerateSeatingChartInputSchema,
    outputSchema: GenerateSeatingChartOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
