"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addExerciseToSession as addExerciseToSessionRow,
  deleteSet as deleteSetRow,
  logSet as logSetRow,
  removeExerciseFromSession as removeExerciseFromSessionRow,
  startSession as startSessionRow,
  updateSet as updateSetRow,
  type SessionResult,
  type SetInput,
  type SetResult,
} from "@/lib/sessions/store";

// Form actions must return void: the only realistic failure here is the exercise/template
// having been deleted between page render and click, which a single user can't cause except
// by racing two tabs - surface it as a hard error rather than growing a form-action error UI
// for a case this unlikely.

export async function startSessionFromExercise(exerciseId: string): Promise<void> {
  const result = await startSessionRow({ exerciseId });
  if (!result.ok) throw new Error(result.error);
  redirect(`/sessions/${result.session.id}`);
}

export async function startSessionFromTemplate(templateId: string): Promise<void> {
  const result = await startSessionRow({ templateId });
  if (!result.ok) throw new Error(result.error);
  redirect(`/sessions/${result.session.id}`);
}

// Revalidated by route pattern (not a specific id) so callers never need to thread sessionId
// through just to tell Next which page to refresh.
function revalidateSessionDetail() {
  revalidatePath("/sessions/[id]", "page");
}

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
): Promise<SessionResult> {
  const result = await addExerciseToSessionRow(sessionId, exerciseId);
  if (result.ok) revalidateSessionDetail();
  return result;
}

export async function removeExerciseFromSession(
  sessionId: string,
  loggedExerciseId: string,
): Promise<SessionResult> {
  const result = await removeExerciseFromSessionRow(sessionId, loggedExerciseId);
  if (result.ok) revalidateSessionDetail();
  return result;
}

export async function logSet(loggedExerciseId: string, input: SetInput): Promise<SetResult> {
  const result = await logSetRow(loggedExerciseId, input);
  if (result.ok) revalidateSessionDetail();
  return result;
}

export async function updateSet(id: string, input: SetInput): Promise<SetResult> {
  const result = await updateSetRow(id, input);
  if (result.ok) revalidateSessionDetail();
  return result;
}

export async function deleteSet(id: string): Promise<void> {
  await deleteSetRow(id);
  revalidateSessionDetail();
}
