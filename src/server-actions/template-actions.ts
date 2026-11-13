"use server";

import { revalidatePath } from "next/cache";

import {
  createTemplate as createTemplateRow,
  deleteTemplate as deleteTemplateRow,
  updateTemplate as updateTemplateRow,
  type TemplateResult,
} from "@/lib/templates/store";
import type { TemplateInput } from "@/lib/templates/validation";

export async function createTemplate(input: TemplateInput): Promise<TemplateResult> {
  const result = await createTemplateRow(input);
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function updateTemplate(id: string, input: TemplateInput): Promise<TemplateResult> {
  const result = await updateTemplateRow(id, input);
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function deleteTemplate(id: string): Promise<void> {
  await deleteTemplateRow(id);
  revalidatePath("/templates");
}
