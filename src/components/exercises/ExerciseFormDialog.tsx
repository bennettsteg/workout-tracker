"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { createExercise, updateExercise } from "@/server-actions/exercise-actions";

type ExerciseFormValues = {
  id?: string;
  name: string;
  category: string;
  notes: string;
};

export function ExerciseFormDialog({
  exercise,
  trigger,
}: {
  exercise?: ExerciseFormValues;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(exercise?.name ?? "");
  const [category, setCategory] = useState(exercise?.category ?? "");
  const [notes, setNotes] = useState(exercise?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(exercise?.name ?? "");
      setCategory(exercise?.category ?? "");
      setNotes(exercise?.notes ?? "");
      setError(null);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const input = { name, category, notes };
      const result = exercise?.id
        ? await updateExercise(exercise.id, input)
        : await createExercise(input);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exercise ? "Edit Exercise" : "New Exercise"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exercise-name">Name</Label>
            <Input
              id="exercise-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exercise-category">Category (optional)</Label>
            <Input
              id="exercise-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Legs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exercise-notes">Notes (optional)</Label>
            <Textarea
              id="exercise-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Form cues, equipment specifics..."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {exercise ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
