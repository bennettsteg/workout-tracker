import type { ValidationResult } from "@/lib/validation";

export type ExerciseInput = {
  name: string;
  category?: string | null;
  notes?: string | null;
};

export type ParsedExercise = {
  name: string;
  category: string | null;
  notes: string | null;
};

export function parseExerciseInput(input: ExerciseInput): ValidationResult<ParsedExercise> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  return {
    ok: true,
    value: {
      name,
      category: input.category?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  };
}
