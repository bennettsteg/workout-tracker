import { prisma } from "@/lib/db";
import type { ValidationResult } from "@/lib/validation";

export type SetDetail = {
  id: string;
  order: number;
  reps: number;
  weight: number;
};

export type LoggedExerciseDetail = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number | null;
  targetReps: number | null;
  targetWeight: number | null;
  sets: SetDetail[];
};

export type SessionDetail = {
  id: string;
  startedAt: Date;
  templateId: string | null;
  templateName: string | null;
  loggedExercises: LoggedExerciseDetail[];
};

export type StartSessionInput = { exerciseId: string } | { templateId: string };

export type SessionResult = { ok: true; session: SessionDetail } | { ok: false; error: string };

const sessionInclude = {
  template: true,
  loggedExercises: {
    orderBy: { order: "asc" as const },
    include: { exercise: true, sets: { orderBy: { order: "asc" as const } } },
  },
};

function mapSession(session: {
  id: string;
  startedAt: Date;
  templateId: string | null;
  template: { name: string } | null;
  loggedExercises: Array<{
    id: string;
    exerciseId: string;
    exercise: { name: string };
    order: number;
    targetSets: number | null;
    targetReps: number | null;
    targetWeight: number | null;
    sets: Array<{ id: string; order: number; reps: number; weight: number }>;
  }>;
}): SessionDetail {
  return {
    id: session.id,
    startedAt: session.startedAt,
    templateId: session.templateId,
    templateName: session.template?.name ?? null,
    loggedExercises: session.loggedExercises.map((le) => ({
      id: le.id,
      exerciseId: le.exerciseId,
      exerciseName: le.exercise.name,
      order: le.order,
      targetSets: le.targetSets,
      targetReps: le.targetReps,
      targetWeight: le.targetWeight,
      sets: le.sets.map((s) => ({ id: s.id, order: s.order, reps: s.reps, weight: s.weight })),
    })),
  };
}

export async function startSession(input: StartSessionInput): Promise<SessionResult> {
  if ("exerciseId" in input) {
    const exercise = await prisma.exercise.findUnique({ where: { id: input.exerciseId } });
    if (!exercise) return { ok: false, error: "That exercise no longer exists." };

    const session = await prisma.workoutSession.create({
      data: { loggedExercises: { create: [{ exerciseId: exercise.id, order: 0 }] } },
      include: sessionInclude,
    });
    return { ok: true, session: mapSession(session) };
  }

  const template = await prisma.template.findUnique({
    where: { id: input.templateId },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!template) return { ok: false, error: "That template no longer exists." };

  const session = await prisma.workoutSession.create({
    data: {
      templateId: template.id,
      loggedExercises: {
        create: template.exercises.map((te, index) => ({
          exerciseId: te.exerciseId,
          order: index,
          targetSets: te.targetSets,
          targetReps: te.targetReps,
          targetWeight: te.targetWeight,
        })),
      },
    },
    include: sessionInclude,
  });
  return { ok: true, session: mapSession(session) };
}

export async function getSessionDetail(id: string): Promise<SessionDetail | null> {
  const session = await prisma.workoutSession.findUnique({ where: { id }, include: sessionInclude });
  return session ? mapSession(session) : null;
}

/** Adds another Exercise to a session already in progress (ad-hoc or template-started alike). */
export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
): Promise<SessionResult> {
  const count = await prisma.loggedExercise.count({ where: { sessionId } });
  try {
    const session = await prisma.workoutSession.update({
      where: { id: sessionId },
      data: { loggedExercises: { create: [{ exerciseId, order: count }] } },
      include: sessionInclude,
    });
    return { ok: true, session: mapSession(session) };
  } catch {
    return { ok: false, error: "That session no longer exists." };
  }
}

/** Removes a LoggedExercise (and its sets) from a session. */
export async function removeExerciseFromSession(
  sessionId: string,
  loggedExerciseId: string,
): Promise<SessionResult> {
  try {
    await prisma.loggedExercise.delete({ where: { id: loggedExerciseId, sessionId } });
  } catch {
    return { ok: false, error: "That logged exercise no longer exists." };
  }
  const session = await prisma.workoutSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: sessionInclude,
  });
  return { ok: true, session: mapSession(session) };
}

export type SetInput = { reps: number; weight: number };
export type SetResult = { ok: true; set: SetDetail } | { ok: false; error: string };

function parseSetInput(input: SetInput): ValidationResult<SetInput> {
  if (!Number.isInteger(input.reps) || input.reps <= 0) {
    return { ok: false, error: "Reps must be a positive whole number." };
  }
  if (!(input.weight >= 0)) return { ok: false, error: "Weight cannot be negative." };
  return { ok: true, value: input };
}

export async function logSet(loggedExerciseId: string, input: SetInput): Promise<SetResult> {
  const parsed = parseSetInput(input);
  if (!parsed.ok) return parsed;

  const count = await prisma.set.count({ where: { loggedExerciseId } });
  const set = await prisma.set.create({
    data: { loggedExerciseId, order: count, reps: parsed.value.reps, weight: parsed.value.weight },
  });
  return { ok: true, set };
}

export async function updateSet(id: string, input: SetInput): Promise<SetResult> {
  const parsed = parseSetInput(input);
  if (!parsed.ok) return parsed;

  try {
    const set = await prisma.set.update({
      where: { id },
      data: { reps: parsed.value.reps, weight: parsed.value.weight },
    });
    return { ok: true, set };
  } catch {
    return { ok: false, error: "That set no longer exists." };
  }
}

export async function deleteSet(id: string): Promise<void> {
  await prisma.set.delete({ where: { id } });
}

export type SessionSummary = {
  id: string;
  startedAt: Date;
  templateId: string | null;
  templateName: string | null;
  exerciseNames: string[];
};

export async function listSessions(): Promise<SessionSummary[]> {
  const sessions = await prisma.workoutSession.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      template: true,
      loggedExercises: { orderBy: { order: "asc" }, include: { exercise: true } },
    },
  });
  return sessions.map((session) => ({
    id: session.id,
    startedAt: session.startedAt,
    templateId: session.templateId,
    templateName: session.template?.name ?? null,
    exerciseNames: session.loggedExercises.map((le) => le.exercise.name),
  }));
}
