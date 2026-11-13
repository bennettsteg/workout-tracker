import type { BodyWeightEntry } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type BodyWeightInput = { date: Date; weight: number };
export type BodyWeightResult =
  | { ok: true; entry: BodyWeightEntry }
  | { ok: false; error: string };

export async function logBodyWeight(input: BodyWeightInput): Promise<BodyWeightResult> {
  if (!(input.weight > 0)) return { ok: false, error: "Weight must be greater than zero." };

  const entry = await prisma.bodyWeightEntry.create({
    data: { date: input.date, weight: input.weight },
  });
  return { ok: true, entry };
}

export async function listBodyWeightEntries(): Promise<BodyWeightEntry[]> {
  return prisma.bodyWeightEntry.findMany({ orderBy: { date: "asc" } });
}
