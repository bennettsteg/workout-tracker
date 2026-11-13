export type ExerciseOption = { id: string; name: string };

export function exerciseName(exercises: ExerciseOption[], id: string): string {
  return exercises.find((e) => e.id === id)?.name ?? "Unknown";
}
