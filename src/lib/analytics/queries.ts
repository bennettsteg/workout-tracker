import { prisma } from "@/lib/db";

export type ExerciseProgressionPoint = { date: Date; maxWeight: number };
export type BodyWeightProgressionPoint = { date: Date; weight: number };

/** One point per session that logged this Exercise, y = the heaviest single Set that session. */
export async function getExerciseProgression(exerciseId: string): Promise<ExerciseProgressionPoint[]> {
  const loggedExercises = await prisma.loggedExercise.findMany({
    where: { exerciseId, sets: { some: {} } },
    include: { session: true, sets: true },
    orderBy: { session: { startedAt: "asc" } },
  });

  return loggedExercises.map((le) => ({
    date: le.session.startedAt,
    maxWeight: Math.max(...le.sets.map((s) => s.weight)),
  }));
}

export async function getBodyWeightProgression(): Promise<BodyWeightProgressionPoint[]> {
  const entries = await prisma.bodyWeightEntry.findMany({ orderBy: { date: "asc" } });
  return entries.map((e) => ({ date: e.date, weight: e.weight }));
}
