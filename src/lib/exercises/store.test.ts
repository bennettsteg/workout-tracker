import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { createExercise, listExercises, updateExercise } from "./store";

// Live-database tests (needs a reachable DATABASE_URL). Name prefix keeps rows identifiable
// and isolated from anything else that might exist in the database; each test cleans its own.

const NAME_PREFIX = `exercise-store-test-${process.pid}-${Date.now()}`;

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.exercise.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } });
});

describe("createExercise", () => {
  it("saves a validated Exercise with a trimmed name", async () => {
    const result = await createExercise({ name: `  ${NAME_PREFIX} Bench Press  ` });

    expect(result.ok).toBe(true);
    const saved = await prisma.exercise.findFirstOrThrow({
      where: { name: { startsWith: NAME_PREFIX } },
    });
    expect(saved.name).toBe(`${NAME_PREFIX} Bench Press`);
    expect(saved.category).toBeNull();
    expect(saved.notes).toBeNull();
  });

  it("saves an optional category and notes", async () => {
    const result = await createExercise({
      name: `${NAME_PREFIX} Squat`,
      category: "Legs",
      notes: "Keep knees out",
    });

    expect(result.ok).toBe(true);
    const saved = await prisma.exercise.findFirstOrThrow({ where: { name: `${NAME_PREFIX} Squat` } });
    expect(saved.category).toBe("Legs");
    expect(saved.notes).toBe("Keep knees out");
  });

  it("writes nothing and reports the error for a blank name", async () => {
    const result = await createExercise({ name: "   " });

    expect(result.ok).toBe(false);
    expect(await prisma.exercise.count({ where: { name: { startsWith: NAME_PREFIX } } })).toBe(0);
  });
});

describe("updateExercise", () => {
  it("updates name/category/notes on an existing Exercise", async () => {
    const created = await createExercise({ name: `${NAME_PREFIX} Deadlift` });
    if (!created.ok) throw new Error("setup failed");

    const result = await updateExercise(created.exercise.id, {
      name: `${NAME_PREFIX} Deadlift (sumo)`,
      category: "Back",
      notes: "Grip just outside shins",
    });

    expect(result.ok).toBe(true);
    const saved = await prisma.exercise.findUniqueOrThrow({ where: { id: created.exercise.id } });
    expect(saved).toMatchObject({
      name: `${NAME_PREFIX} Deadlift (sumo)`,
      category: "Back",
      notes: "Grip just outside shins",
    });
  });

  it("rejects invalid input and leaves the Exercise as it was", async () => {
    const created = await createExercise({ name: `${NAME_PREFIX} Row` });
    if (!created.ok) throw new Error("setup failed");

    const result = await updateExercise(created.exercise.id, { name: "  " });

    expect(result.ok).toBe(false);
    expect((await prisma.exercise.findUniqueOrThrow({ where: { id: created.exercise.id } })).name).toBe(
      `${NAME_PREFIX} Row`,
    );
  });

  it("reports an error for an Exercise that no longer exists", async () => {
    const result = await updateExercise("does-not-exist", { name: `${NAME_PREFIX} Ghost` });

    expect(result.ok).toBe(false);
  });
});

describe("listExercises", () => {
  it("lists Exercises alphabetically by name", async () => {
    await createExercise({ name: `${NAME_PREFIX} Zebra Curl` });
    await createExercise({ name: `${NAME_PREFIX} Apple Press` });

    const list = await listExercises();
    const names = list.map((e) => e.name).filter((n) => n.startsWith(NAME_PREFIX));
    expect(names).toEqual([`${NAME_PREFIX} Apple Press`, `${NAME_PREFIX} Zebra Curl`]);
  });
});
