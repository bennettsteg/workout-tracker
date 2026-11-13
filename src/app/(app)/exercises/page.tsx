import { Dumbbell, Plus } from "lucide-react";

import { ExerciseFormDialog } from "@/components/exercises/ExerciseFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listExercises } from "@/lib/exercises/store";

export default async function ExercisesPage() {
  const exercises = await listExercises();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Exercises</h1>
        <ExerciseFormDialog
          trigger={
            <Button>
              <Plus /> New Exercise
            </Button>
          }
        />
      </div>

      {exercises.length === 0 ? (
        <p className="text-muted-foreground">
          No exercises yet. Add one to start building your library.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {exercises.map((exercise) => (
            <Card key={exercise.id} size="sm">
              <CardContent className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <Dumbbell className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{exercise.name}</p>
                    {exercise.category && (
                      <p className="text-sm text-muted-foreground">{exercise.category}</p>
                    )}
                    {exercise.notes && <p className="mt-1 text-sm text-muted-foreground">{exercise.notes}</p>}
                  </div>
                </div>
                <ExerciseFormDialog
                  exercise={{
                    id: exercise.id,
                    name: exercise.name,
                    category: exercise.category ?? "",
                    notes: exercise.notes ?? "",
                  }}
                  trigger={<Button variant="outline">Edit</Button>}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
