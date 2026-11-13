"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SessionDetail, SetDetail } from "@/lib/sessions/store";
import {
  addExerciseToSession,
  deleteSet,
  logSet,
  removeExerciseFromSession,
  updateSet,
} from "@/server-actions/session-actions";

type ExerciseOption = { id: string; name: string };

function targetSummary(le: SessionDetail["loggedExercises"][number]) {
  const parts: string[] = [];
  if (le.targetSets != null) parts.push(`${le.targetSets} sets`);
  if (le.targetReps != null) parts.push(`${le.targetReps} reps`);
  if (le.targetWeight != null) parts.push(`${le.targetWeight} lbs`);
  return parts.length > 0 ? `Target: ${parts.join(" x ")}` : null;
}

/** The reps/weight input pair shared by SetRow's edit mode and AddSetForm. */
function RepsWeightFields({
  reps,
  weight,
  onRepsChange,
  onWeightChange,
  placeholders,
}: {
  reps: string;
  weight: string;
  onRepsChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  placeholders?: boolean;
}) {
  return (
    <>
      <Input
        type="number"
        min={1}
        placeholder={placeholders ? "reps" : undefined}
        value={reps}
        onChange={(e) => onRepsChange(e.target.value)}
        className="w-20"
        required
      />
      <span className="text-muted-foreground">x</span>
      <Input
        type="number"
        min={0}
        placeholder={placeholders ? "lbs" : undefined}
        value={weight}
        onChange={(e) => onWeightChange(e.target.value)}
        className="w-24"
        required
      />
      {!placeholders && <span className="text-muted-foreground">lbs</span>}
    </>
  );
}

function SetRow({ set }: { set: SetDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [reps, setReps] = useState(set.reps.toString());
  const [weight, setWeight] = useState(set.weight.toString());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateSet(set.id, { reps: Number(reps), weight: Number(weight) });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteSet(set.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <RepsWeightFields reps={reps} weight={weight} onRepsChange={setReps} onWeightChange={setWeight} />
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          Save
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditing(false)} aria-label="Cancel">
          <X />
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span>
        {set.reps} reps x {set.weight} lbs
      </span>
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label="Edit set">
        <Pencil />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" disabled={pending} onClick={remove} aria-label="Remove set">
        <Trash2 />
      </Button>
    </div>
  );
}

function AddSetForm({ loggedExerciseId }: { loggedExerciseId: string }) {
  const router = useRouter();
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await logSet(loggedExerciseId, { reps: Number(reps), weight: Number(weight) });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReps("");
      setWeight("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <RepsWeightFields reps={reps} weight={weight} onRepsChange={setReps} onWeightChange={setWeight} placeholders />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <Plus /> Add Set
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

function RemoveExerciseButton({ sessionId, loggedExerciseId }: { sessionId: string; loggedExerciseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      await removeExerciseFromSession(sessionId, loggedExerciseId);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="ghost" size="icon-sm" disabled={pending} onClick={remove} aria-label="Remove exercise">
      <Trash2 />
    </Button>
  );
}

function AddExerciseControl({ sessionId, exercises }: { sessionId: string; exercises: ExerciseOption[] }) {
  const router = useRouter();
  const [exerciseId, setExerciseId] = useState<string | null>(exercises[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (exercises.length === 0) return null;

  function onAdd() {
    if (!exerciseId) return;
    startTransition(async () => {
      const result = await addExerciseToSession(sessionId, exerciseId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={exerciseId ?? undefined} onValueChange={(v) => setExerciseId(v)}>
        <SelectTrigger className="flex-1">
          <SelectValue>{exercises.find((e) => e.id === exerciseId)?.name ?? "Pick an exercise"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {exercises.map((ex) => (
            <SelectItem key={ex.id} value={ex.id}>
              {ex.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" disabled={pending} onClick={onAdd}>
        <Plus /> Add Exercise
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function SessionLogger({
  session,
  exercises,
}: {
  session: SessionDetail;
  exercises: ExerciseOption[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {session.loggedExercises.map((le) => (
        <div key={le.id} className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="font-medium">{le.exerciseName}</p>
              {targetSummary(le) && <p className="text-sm text-muted-foreground">{targetSummary(le)}</p>}
            </div>
            <RemoveExerciseButton sessionId={session.id} loggedExerciseId={le.id} />
          </div>
          <div className="flex flex-col gap-1.5">
            {le.sets.map((set) => (
              <SetRow key={set.id} set={set} />
            ))}
            {le.sets.length === 0 && (
              <p className="text-sm text-muted-foreground">No sets logged yet.</p>
            )}
          </div>
          <div className="mt-2">
            <AddSetForm loggedExerciseId={le.id} />
          </div>
        </div>
      ))}

      <AddExerciseControl sessionId={session.id} exercises={exercises} />
    </div>
  );
}
