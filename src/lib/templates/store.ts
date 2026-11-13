import type { Template } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

import { parseTemplateInput, type TemplateInput } from "./validation";

export type TemplateResult = { ok: true; template: Template } | { ok: false; error: string };

export async function createTemplate(input: TemplateInput): Promise<TemplateResult> {
  const parsed = parseTemplateInput(input);
  if (!parsed.ok) return parsed;

  const template = await prisma.template.create({
    data: {
      name: parsed.value.name,
      exercises: {
        create: parsed.value.exercises.map((exercise, index) => ({ ...exercise, order: index })),
      },
    },
  });
  return { ok: true, template };
}

/**
 * Fully replaces the Template's exercise list (add/remove/reorder/re-target). Already-logged
 * WorkoutSessions keep their own snapshot of targets, so this never touches them.
 */
export async function updateTemplate(id: string, input: TemplateInput): Promise<TemplateResult> {
  const parsed = parseTemplateInput(input);
  if (!parsed.ok) return parsed;

  try {
    const template = await prisma.$transaction(async (tx) => {
      await tx.templateExercise.deleteMany({ where: { templateId: id } });
      return tx.template.update({
        where: { id },
        data: {
          name: parsed.value.name,
          exercises: {
            create: parsed.value.exercises.map((exercise, index) => ({ ...exercise, order: index })),
          },
        },
      });
    });
    return { ok: true, template };
  } catch {
    return { ok: false, error: "That template no longer exists." };
  }
}

/** Deletes the Template. Past WorkoutSessions keep their logged data; their templateId goes null. */
export async function deleteTemplate(id: string): Promise<void> {
  await prisma.template.delete({ where: { id } });
}

export async function listTemplates() {
  return prisma.template.findMany({
    orderBy: { name: "asc" },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
}
