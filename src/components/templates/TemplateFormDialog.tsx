"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTemplate, updateTemplate } from "@/server-actions/template-actions";

import { exerciseName, type ExerciseOption } from "./exerciseOptions";

type TemplateExerciseRow = {
  exerciseId: string;
  targetSets: string;
  targetReps: string;
  targetWeight: string;
};

type TemplateFormValues = {
  id?: string;
  name: string;
  exercises: { exerciseId: string; targetSets: number | null; targetReps: number | null; targetWeight: number | null }[];
};

function emptyRow(exerciseId: string): TemplateExerciseRow {
  return { exerciseId, targetSets: "", targetReps: "", targetWeight: "" };
}

function rowsFromTemplate(template: TemplateFormValues | undefined): TemplateExerciseRow[] {
  return (
    template?.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      targetSets: e.targetSets?.toString() ?? "",
      targetReps: e.targetReps?.toString() ?? "",
      targetWeight: e.targetWeight?.toString() ?? "",
    })) ?? []
  );
}

export function TemplateFormDialog({
  exercises,
  template,
  trigger,
}: {
  exercises: ExerciseOption[];
  template?: TemplateFormValues;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(template?.name ?? "");
  const [rows, setRows] = useState<TemplateExerciseRow[]>(rowsFromTemplate(template));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(template?.name ?? "");
      setRows(rowsFromTemplate(template));
      setError(null);
    }
  }

  function addRow() {
    if (exercises.length === 0) return;
    setRows((prev) => [...prev, emptyRow(exercises[0].id)]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function moveRow(index: number, direction: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateRow(index: number, patch: Partial<TemplateExerciseRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const input = {
        name,
        exercises: rows.map((row) => ({
          exerciseId: row.exerciseId,
          targetSets: row.targetSets ? Number(row.targetSets) : null,
          targetReps: row.targetReps ? Number(row.targetReps) : null,
          targetWeight: row.targetWeight ? Number(row.targetWeight) : null,
        })),
      };
      const result = template?.id
        ? await updateTemplate(template.id, input)
        : await createTemplate(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-name">Name</Label>
            <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Exercises</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={exercises.length === 0}>
                <Plus /> Add Exercise
              </Button>
            </div>

            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">Add at least one exercise.</p>
            )}

            {rows.map((row, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2">
                  <Select
                    value={row.exerciseId}
                    onValueChange={(v) => v && updateRow(index, { exerciseId: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue>{exerciseName(exercises, row.exerciseId)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {exercises.map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>
                          {ex.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeRow(index)} aria-label="Remove">
                    <X />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Target sets</Label>
                    <Input
                      type="number"
                      min={0}
                      value={row.targetSets}
                      onChange={(e) => updateRow(index, { targetSets: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Target reps</Label>
                    <Input
                      type="number"
                      min={0}
                      value={row.targetReps}
                      onChange={(e) => updateRow(index, { targetReps: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Target weight</Label>
                    <Input
                      type="number"
                      min={0}
                      value={row.targetWeight}
                      onChange={(e) => updateRow(index, { targetWeight: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {template ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
