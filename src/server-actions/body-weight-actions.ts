"use server";

import { revalidatePath } from "next/cache";

import {
  logBodyWeight as logBodyWeightRow,
  type BodyWeightInput,
  type BodyWeightResult,
} from "@/lib/bodyWeight/store";

export async function logBodyWeight(input: BodyWeightInput): Promise<BodyWeightResult> {
  const result = await logBodyWeightRow(input);
  if (result.ok) revalidatePath("/body-weight");
  return result;
}
