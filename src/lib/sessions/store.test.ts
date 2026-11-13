import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { createExercise } from "@/lib/exercises/store";
import { createTemplate, updateTemplate } from "@/lib/templates/store";

import {
  addExerciseToSession,
  deleteSet,
  getSessionDetail,
  listSessions,
  logSet,
  removeExerciseFromSession,
  startSession,
  updateSet,
} from "./store";

const NAME_PREFIX = `session-store-test-${process.pid}-${Date.now()}`;

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

describe("startSession", () => {
  it("starts an ad-hoc session from a single Exercise, with no template and no sets yet", async () => {
    const bench = await makeExercise("Bench");

    const result = await startSession({ exerciseId: bench.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.templateId).toBeNull();
    expect(result.session.templateName).toBeNull();
    expect(result.session.loggedExercises).toHaveLength(1);
    expect(result.session.loggedExercises[0]).toMatchObject({
      exerciseId: bench.id,
      exerciseName: bench.name,
      order: 0,
      targetSets: null,
      targetReps: null,
      targetWeight: null,
      sets: [],
    });
  });

  it("reports an error for an ad-hoc exercise that no longer exists", async () => {
    const result = await startSession({ exerciseId: "does-not-exist" });
    expect(result.ok).toBe(false);
  });

  it("starts a session from a Template, pre-filling exercise order and targets", async () => {
    const bench = await makeExercise("Bench");
    const row = await makeExercise("Row");
    const template = await createTemplate({
      name: `${NAME_PREFIX} Push Day`,
      exercises: [
        { exerciseId: bench.id, targetSets: 3, targetReps: 5, targetWeight: 135 },
        { exerciseId: row.id },
      ],
    });
    if (!template.ok) throw new Error("setup failed");

    const result = await startSession({ templateId: template.template.id });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.templateId).toBe(template.template.id);
    expect(result.session.templateName).toBe(`${NAME_PREFIX} Push Day`);
    expect(result.session.loggedExercises.map((le) => le.exerciseId)).toEqual([bench.id, row.id]);
    expect(result.session.loggedExercises[0]).toMatchObject({
      targetSets: 3,
      targetReps: 5,
      targetWeight: 135,
      sets: [],
    });
    expect(result.session.loggedExercises[1]).toMatchObject({
      targetSets: null,
      targetReps: null,
      targetWeight: null,
    });
  });

  it("reports an error for a template that no longer exists", async () => {
    const result = await startSession({ templateId: "does-not-exist" });
    expect(result.ok).toBe(false);
  });

  it("is unaffected by a later edit to the Template it started from", async () => {
    const bench = await makeExercise("Bench");
    const template = await createTemplate({
      name: `${NAME_PREFIX} Push Day`,
      exercises: [{ exerciseId: bench.id, targetSets: 3, targetReps: 5, targetWeight: 135 }],
    });
    if (!template.ok) throw new Error("setup failed");

    const started = await startSession({ templateId: template.template.id });
    if (!started.ok) throw new Error("setup failed");

    await updateTemplate(template.template.id, {
      name: `${NAME_PREFIX} Push Day renamed`,
      exercises: [{ exerciseId: bench.id, targetSets: 10, targetReps: 1, targetWeight: 999 }],
    });

    const detail = await getSessionDetail(started.session.id);
    expect(detail?.loggedExercises[0]).toMatchObject({ targetSets: 3, targetReps: 5, targetWeight: 135 });
  });
});

describe("addExerciseToSession", () => {
  it("appends another Exercise to an already-started ad-hoc session", async () => {
    const bench = await makeExercise("Bench");
    const squat = await makeExercise("Squat");
    const started = await startSession({ exerciseId: bench.id });
    if (!started.ok) throw new Error("setup failed");

    const result = await addExerciseToSession(started.session.id, squat.id);

    expect(result.ok).toBe(true);
    const detail = await getSessionDetail(started.session.id);
    expect(detail?.loggedExercises.map((le) => le.exerciseId)).toEqual([bench.id, squat.id]);
    expect(detail?.loggedExercises[1]).toMatchObject({
      order: 1,
      targetSets: null,
      targetReps: null,
      targetWeight: null,
      sets: [],
    });
  });

  it("reports an error for a session that no longer exists", async () => {
    const bench = await makeExercise("Bench");

    const result = await addExerciseToSession("does-not-exist", bench.id);

    expect(result.ok).toBe(false);
  });
});

describe("removeExerciseFromSession", () => {
  it("removes a LoggedExercise (and its sets) from a session, leaving the others", async () => {
    const bench = await makeExercise("Bench");
    const squat = await makeExercise("Squat");
    const started = await startSession({ exerciseId: bench.id });
    if (!started.ok) throw new Error("setup failed");
    const added = await addExerciseToSession(started.session.id, squat.id);
    if (!added.ok) throw new Error("setup failed");
    const squatLoggedExerciseId = added.session.loggedExercises[1].id;
    const benchLoggedExerciseId = added.session.loggedExercises[0].id;
    await prisma.set.create({ data: { loggedExerciseId: squatLoggedExerciseId, order: 0, reps: 5, weight: 225 } });

    const result = await removeExerciseFromSession(started.session.id, squatLoggedExerciseId);

    expect(result.ok).toBe(true);
    const detail = await getSessionDetail(started.session.id);
    expect(detail?.loggedExercises.map((le) => le.id)).toEqual([benchLoggedExerciseId]);
    expect(await prisma.set.count({ where: { loggedExerciseId: squatLoggedExerciseId } })).toBe(0);
  });

  it("reports an error for a LoggedExercise that no longer exists", async () => {
    const bench = await makeExercise("Bench");
    const started = await startSession({ exerciseId: bench.id });
    if (!started.ok) throw new Error("setup failed");

    const result = await removeExerciseFromSession(started.session.id, "does-not-exist");

    expect(result.ok).toBe(false);
  });
});

describe("logSet / updateSet / deleteSet", () => {
  async function startAdHoc(suffix: string) {
    const exercise = await makeExercise(suffix);
    const result = await startSession({ exerciseId: exercise.id });
    if (!result.ok) throw new Error("setup failed");
    return result.session;
  }

  it("logs sets with independent reps and weight, in order", async () => {
    const session = await startAdHoc("Bench");
    const loggedExerciseId = session.loggedExercises[0].id;

    await logSet(loggedExerciseId, { reps: 10, weight: 135 });
    await logSet(loggedExerciseId, { reps: 8, weight: 155 });

    const detail = await getSessionDetail(session.id);
    expect(detail?.loggedExercises[0].sets.map((s) => ({ reps: s.reps, weight: s.weight }))).toEqual([
      { reps: 10, weight: 135 },
      { reps: 8, weight: 155 },
    ]);
  });

  it("edits a Set's reps/weight", async () => {
    const session = await startAdHoc("Squat");
    const set = await logSet(session.loggedExercises[0].id, { reps: 10, weight: 135 });
    if (!set.ok) throw new Error("setup failed");

    const result = await updateSet(set.set.id, { reps: 6, weight: 175 });

    expect(result.ok).toBe(true);
    const detail = await getSessionDetail(session.id);
    expect(detail?.loggedExercises[0].sets[0]).toMatchObject({ reps: 6, weight: 175 });
  });

  it("removes a Set", async () => {
    const session = await startAdHoc("Deadlift");
    const set = await logSet(session.loggedExercises[0].id, { reps: 10, weight: 135 });
    if (!set.ok) throw new Error("setup failed");

    await deleteSet(set.set.id);

    const detail = await getSessionDetail(session.id);
    expect(detail?.loggedExercises[0].sets).toHaveLength(0);
  });

  it("rejects a Set with zero or negative reps, without writing it", async () => {
    const session = await startAdHoc("OHP");

    const result = await logSet(session.loggedExercises[0].id, { reps: 0, weight: 95 });

    expect(result.ok).toBe(false);
    const detail = await getSessionDetail(session.id);
    expect(detail?.loggedExercises[0].sets).toHaveLength(0);
  });

  it("rejects a Set with negative weight on update, leaving the Set as it was", async () => {
    const session = await startAdHoc("Curl");
    const set = await logSet(session.loggedExercises[0].id, { reps: 10, weight: 30 });
    if (!set.ok) throw new Error("setup failed");

    const result = await updateSet(set.set.id, { reps: 10, weight: -5 });

    expect(result.ok).toBe(false);
    const detail = await getSessionDetail(session.id);
    expect(detail?.loggedExercises[0].sets[0]).toMatchObject({ reps: 10, weight: 30 });
  });
});

describe("listSessions", () => {
  it("lists sessions most-recent first, with their exercise names and template name", async () => {
    const bench = await makeExercise("Bench");
    const template = await createTemplate({
      name: `${NAME_PREFIX} Push Day`,
      exercises: [{ exerciseId: bench.id }],
    });
    if (!template.ok) throw new Error("setup failed");

    const first = await startSession({ exerciseId: bench.id });
    const second = await startSession({ templateId: template.template.id });
    if (!first.ok || !second.ok) throw new Error("setup failed");

    const list = await listSessions();
    const ids = list.map((s) => s.id);
    expect(ids.indexOf(second.session.id)).toBeLessThan(ids.indexOf(first.session.id));
    const secondSummary = list.find((s) => s.id === second.session.id);
    expect(secondSummary).toMatchObject({
      templateId: template.template.id,
      templateName: `${NAME_PREFIX} Push Day`,
      exerciseNames: [bench.name],
    });
  });
});
