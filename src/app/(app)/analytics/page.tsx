import { ExercisePicker } from "@/components/analytics/ExercisePicker";
import { ProgressionChart, type ProgressionPoint } from "@/components/analytics/ProgressionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBodyWeightProgression, getExerciseProgression } from "@/lib/analytics/queries";
import { formatCalendarDate, formatInstantDate } from "@/lib/date";
import { listExercises } from "@/lib/exercises/store";

// Always reflects current data; never worth prerendering/caching for a single user.
export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>;
}) {
  const [{ exercise: exerciseIdParam }, exercises, bodyWeight] = await Promise.all([
    searchParams,
    listExercises(),
    getBodyWeightProgression(),
  ]);

  const selectedExerciseId = exerciseIdParam ?? exercises[0]?.id;
  const exerciseProgression = selectedExerciseId
    ? await getExerciseProgression(selectedExerciseId)
    : [];

  const strengthData: ProgressionPoint[] = exerciseProgression.map((p) => ({
    date: formatInstantDate(p.date),
    value: p.maxWeight,
  }));
  const bodyWeightData: ProgressionPoint[] = bodyWeight.map((p) => ({
    date: formatCalendarDate(p.date),
    value: p.weight,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">Analytics</h1>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Strength Progression</CardTitle>
          {exercises.length > 0 && selectedExerciseId && (
            <ExercisePicker
              exercises={exercises.map((e) => ({ id: e.id, name: e.name }))}
              selectedId={selectedExerciseId}
            />
          )}
        </CardHeader>
        <CardContent>
          {exercises.length === 0 ? (
            <p className="text-muted-foreground">
              Add an exercise and log a set to see its strength progression.
            </p>
          ) : strengthData.length === 0 ? (
            <p className="text-muted-foreground">
              No sets logged for this exercise yet.
            </p>
          ) : (
            <ProgressionChart data={strengthData} valueLabel="Max weight" unit="lbs" color="var(--chart-1)" />
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Body Weight</CardTitle>
        </CardHeader>
        <CardContent>
          {bodyWeightData.length === 0 ? (
            <p className="text-muted-foreground">No body weight entries yet.</p>
          ) : (
            <ProgressionChart data={bodyWeightData} valueLabel="Body weight" unit="lbs" color="var(--chart-2)" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
