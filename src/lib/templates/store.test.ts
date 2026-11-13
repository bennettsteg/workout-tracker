import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { createExercise } from "@/lib/exercises/store";

import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from "./store";

const NAME_PREFIX = `template-store-test-${process.pid}-${Date.now()}`;

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.workoutSession.deleteMany({
    where: { loggedExercises: { some: { exercise: { name: { startsWith: NAME_PREFIX } } } } },
  });
  await prisma.template.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } });
  await prisma.exercise.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } });
});

async function makeExercise(suffix: string) {
  const result = await createExercise({ name: `${NAME_PREFIX} ${suffix}` });
  if (!result.ok) throw new Error("setup failed");
  return result.exercise;
}

describe("createTemplate", () => {
  it("saves a Template with an ordered list of exercises and optional targets", async () => {
    const bench = await makeExercise("Bench");
    const row = await makeExercise("Row");

    const result = await createTemplate({
      name: `${NAME_PREFIX} Push Day`,
      exercises: [
        { exerciseId: bench.id, targetSets: 3, targetReps: 5, targetWeight: 135 },
        { exerciseId: row.id, targetSets: null, targetReps: null, targetWeight: null },
      ],
    });

    expect(result.ok).toBe(true);
    const saved = await prisma.template.findFirstOrThrow({
      where: { name: `${NAME_PREFIX} Push Day` },
      include: { exercises: { orderBy: { order: "asc" } } },
    });
    expect(saved.exercises.map((e) => e.exerciseId)).toEqual([bench.id, row.id]);
    expect(saved.exercises[0]).toMatchObject({ targetSets: 3, targetReps: 5, targetWeight: 135 });
    expect(saved.exercises[1]).toMatchObject({
      targetSets: null,
      targetReps: null,
      targetWeight: null,
    });
  });
});

describe("updateTemplate", () => {
  it("replaces the exercise list: add, remove, reorder and change targets", async () => {
    const bench = await makeExercise("Bench");
    const row = await makeExercise("Row");
    const curl = await makeExercise("Curl");

    const created = await createTemplate({
      name: `${NAME_PREFIX} Push Day`,
      exercises: [
        { exerciseId: bench.id, targetSets: 3, targetReps: 5, targetWeight: 135 },
        { exerciseId: row.id },
      ],
    });
    if (!created.ok) throw new Error("setup failed");

    const result = await updateTemplate(created.template.id, {
      name: `${NAME_PREFIX} Push Day v2`,
      exercises: [
        { exerciseId: curl.id, targetSets: 4, targetReps: 12 },
        { exerciseId: bench.id, targetSets: 5, targetReps: 5, targetWeight: 145 },
      ],
    });

    expect(result.ok).toBe(true);
    const saved = await prisma.template.findUniqueOrThrow({
      where: { id: created.template.id },
      include: { exercises: { orderBy: { order: "asc" } } },
    });
    expect(saved.name).toBe(`${NAME_PREFIX} Push Day v2`);
    expect(saved.exercises.map((e) => e.exerciseId)).toEqual([curl.id, bench.id]);
    expect(saved.exercises[1]).toMatchObject({ targetSets: 5, targetReps: 5, targetWeight: 145 });
  });

  it("does not affect a WorkoutSession already logged from this Template", async () => {
    const bench = await makeExercise("Bench");
    const created = await createTemplate({
      name: `${NAME_PREFIX} Legacy Day`,
      exercises: [{ exerciseId: bench.id, targetSets: 3, targetReps: 5, targetWeight: 100 }],
    });
    if (!created.ok) throw new Error("setup failed");

    const session = await prisma.workoutSession.create({
      data: {
        templateId: created.template.id,
        loggedExercises: {
          create: [{ exerciseId: bench.id, order: 0, targetSets: 3, targetReps: 5, targetWeight: 100 }],
        },
      },
      include: { loggedExercises: true },
    });

    await updateTemplate(created.template.id, {
      name: `${NAME_PREFIX} Legacy Day renamed`,
      exercises: [{ exerciseId: bench.id, targetSets: 10, targetReps: 1, targetWeight: 999 }],
    });

    const loggedExercise = await prisma.loggedExercise.findUniqueOrThrow({
      where: { id: session.loggedExercises[0].id },
    });
    expect(loggedExercise).toMatchObject({ targetSets: 3, targetReps: 5, targetWeight: 100 });
  });
});

describe("deleteTemplate", () => {
  it("deletes the Template and nulls templateId on past sessions, leaving their data intact", async () => {
    const bench = await makeExercise("Bench");
    const created = await createTemplate({
      name: `${NAME_PREFIX} Doomed Day`,
      exercises: [{ exerciseId: bench.id, targetSets: 3, targetReps: 5, targetWeight: 100 }],
    });
    if (!created.ok) throw new Error("setup failed");

    const session = await prisma.workoutSession.create({
      data: {
        templateId: created.template.id,
        loggedExercises: {
          create: [{ exerciseId: bench.id, order: 0, targetSets: 3, targetReps: 5, targetWeight: 100 }],
        },
      },
    });

    await deleteTemplate(created.template.id);

    expect(await prisma.template.findUnique({ where: { id: created.template.id } })).toBeNull();
    const saved = await prisma.workoutSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(saved.templateId).toBeNull();
    expect(
      await prisma.loggedExercise.count({ where: { sessionId: session.id } }),
    ).toBe(1);
  });
});

describe("listTemplates", () => {
  it("lists Templates with their ordered exercises", async () => {
    const bench = await makeExercise("Bench");
    await createTemplate({ name: `${NAME_PREFIX} Zebra Day`, exercises: [{ exerciseId: bench.id }] });
    await createTemplate({ name: `${NAME_PREFIX} Apple Day`, exercises: [{ exerciseId: bench.id }] });

    const list = await listTemplates();
    const names = list.map((t) => t.name).filter((n) => n.startsWith(NAME_PREFIX));
    expect(names).toEqual([`${NAME_PREFIX} Apple Day`, `${NAME_PREFIX} Zebra Day`]);
  });
});
