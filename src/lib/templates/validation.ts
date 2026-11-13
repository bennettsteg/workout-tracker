import type { ValidationResult } from "@/lib/validation";

export type TemplateExerciseInput = {
  exerciseId: string;
  targetSets?: number | null;
  targetReps?: number | null;
  targetWeight?: number | null;
};

export type TemplateInput = {
  name: string;
  exercises: TemplateExerciseInput[];
};

export type ParsedTemplateExercise = {
  exerciseId: string;
  targetSets: number | null;
  targetReps: number | null;
  targetWeight: number | null;
};

export type ParsedTemplate = {
  name: string;
  exercises: ParsedTemplateExercise[];
};

export function parseTemplateInput(input: TemplateInput): ValidationResult<ParsedTemplate> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (input.exercises.length === 0) return { ok: false, error: "Add at least one exercise." };

  return {
    ok: true,
    value: {
      name,
      exercises: input.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets ?? null,
        targetReps: e.targetReps ?? null,
        targetWeight: e.targetWeight ?? null,
      })),
    },
  };
}
