"use server";

import { revalidatePath } from "next/cache";

import {
  createExercise as createExerciseRow,
  updateExercise as updateExerciseRow,
  type ExerciseResult,
} from "@/lib/exercises/store";
import type { ExerciseInput } from "@/lib/exercises/validation";

export async function createExercise(input: ExerciseInput): Promise<ExerciseResult> {
  const result = await createExerciseRow(input);
  if (result.ok) revalidatePath("/exercises");
  return result;
}

export async function updateExercise(id: string, input: ExerciseInput): Promise<ExerciseResult> {
  const result = await updateExerciseRow(id, input);
  if (result.ok) revalidatePath("/exercises");
  return result;
}
