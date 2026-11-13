"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ExerciseOption = { id: string; name: string };

export function ExercisePicker({ exercises, selectedId }: { exercises: ExerciseOption[]; selectedId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(id: string) {
    const params = new URLSearchParams(searchParams);
    params.set("exercise", id);
    router.push(`/analytics?${params.toString()}`);
  }

  return (
    <Select value={selectedId} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="w-64">
        <SelectValue>{exercises.find((e) => e.id === selectedId)?.name ?? "Pick an exercise"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {exercises.map((ex) => (
          <SelectItem key={ex.id} value={ex.id}>
            {ex.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
