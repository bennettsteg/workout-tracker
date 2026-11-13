import type { Exercise } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

import { parseExerciseInput, type ExerciseInput } from "./validation";

export type ExerciseResult = { ok: true; exercise: Exercise } | { ok: false; error: string };

export async function createExercise(input: ExerciseInput): Promise<ExerciseResult> {
  const parsed = parseExerciseInput(input);
  if (!parsed.ok) return parsed;

  const exercise = await prisma.exercise.create({ data: parsed.value });
  return { ok: true, exercise };
}

export async function updateExercise(id: string, input: ExerciseInput): Promise<ExerciseResult> {
  const parsed = parseExerciseInput(input);
  if (!parsed.ok) return parsed;

  try {
    const exercise = await prisma.exercise.update({ where: { id }, data: parsed.value });
    return { ok: true, exercise };
  } catch {
    return { ok: false, error: "That exercise no longer exists." };
  }
}

export async function listExercises(): Promise<Exercise[]> {
  return prisma.exercise.findMany({ orderBy: { name: "asc" } });
}
