import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { createExercise } from "@/lib/exercises/store";
import { logSet, startSession } from "@/lib/sessions/store";
import { logBodyWeight } from "@/lib/bodyWeight/store";

import { getBodyWeightProgression, getExerciseProgression } from "./queries";

const NAME_PREFIX = `analytics-test-${process.pid}-${Date.now()}`;
const WEIGHT_TAG = Number(`${process.pid}`.slice(-2)) / 100; // keeps our rows out of 900-901 range used elsewhere

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.workoutSession.deleteMany({
    where: { loggedExercises: { some: { exercise: { name: { startsWith: NAME_PREFIX } } } } },
  });
  await prisma.exercise.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } });
  await prisma.bodyWeightEntry.deleteMany({ where: { weight: { gte: 800, lt: 801 } } });
});

async function makeExercise(suffix: string) {
  const result = await createExercise({ name: `${NAME_PREFIX} ${suffix}` });
  if (!result.ok) throw new Error("setup failed");
  return result.exercise;
}

describe("getExerciseProgression", () => {
  it("returns one point per session, using the heaviest single set logged that session", async () => {
    const bench = await makeExercise("Bench");

    const session1 = await startSession({ exerciseId: bench.id });
    if (!session1.ok) throw new Error("setup failed");
    await prisma.workoutSession.update({
      where: { id: session1.session.id },
      data: { startedAt: new Date("2026-01-01T00:00:00.000Z") },
    });
    await logSet(session1.session.loggedExercises[0].id, { reps: 10, weight: 135 });
    await logSet(session1.session.loggedExercises[0].id, { reps: 5, weight: 155 });

    const session2 = await startSession({ exerciseId: bench.id });
    if (!session2.ok) throw new Error("setup failed");
    await prisma.workoutSession.update({
      where: { id: session2.session.id },
      data: { startedAt: new Date("2026-02-01T00:00:00.000Z") },
    });
    await logSet(session2.session.loggedExercises[0].id, { reps: 5, weight: 165 });

    const progression = await getExerciseProgression(bench.id);

    expect(progression).toEqual([
      { date: new Date("2026-01-01T00:00:00.000Z"), maxWeight: 155 },
      { date: new Date("2026-02-01T00:00:00.000Z"), maxWeight: 165 },
    ]);
  });

  it("skips sessions where the exercise has no sets logged yet", async () => {
    const squat = await makeExercise("Squat");
    await startSession({ exerciseId: squat.id });

    const progression = await getExerciseProgression(squat.id);

    expect(progression).toEqual([]);
  });
});

describe("getBodyWeightProgression", () => {
  it("returns one point per entry ordered by date", async () => {
    await logBodyWeight({ date: new Date("2026-02-01T00:00:00.000Z"), weight: 800 + WEIGHT_TAG });
    await logBodyWeight({ date: new Date("2026-01-01T00:00:00.000Z"), weight: 800 + WEIGHT_TAG + 0.01 });

    const progression = await getBodyWeightProgression();
    const ours = progression.filter((p) => p.weight >= 800 && p.weight < 801);

    expect(ours).toEqual([
      { date: new Date("2026-01-01T00:00:00.000Z"), weight: 800 + WEIGHT_TAG + 0.01 },
      { date: new Date("2026-02-01T00:00:00.000Z"), weight: 800 + WEIGHT_TAG },
    ]);
  });
});
