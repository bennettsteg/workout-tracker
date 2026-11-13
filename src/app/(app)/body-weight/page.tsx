import { Scale } from "lucide-react";

import { LogBodyWeightForm } from "@/components/bodyWeight/LogBodyWeightForm";
import { Card, CardContent } from "@/components/ui/card";
import { listBodyWeightEntries } from "@/lib/bodyWeight/store";
import { formatCalendarDate } from "@/lib/date";

// Always reflects the current history; never worth prerendering/caching for a single user.
export const dynamic = "force-dynamic";

export default async function BodyWeightPage() {
  const entries = await listBodyWeightEntries();
  const mostRecentFirst = [...entries].reverse();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">Body Weight</h1>

      <LogBodyWeightForm />

      {mostRecentFirst.length === 0 ? (
        <p className="text-muted-foreground">No body weight entries yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {mostRecentFirst.map((entry) => (
            <Card key={entry.id} size="sm">
              <CardContent className="flex items-center gap-3">
                <Scale className="size-4 text-muted-foreground" />
                <p className="font-medium">{entry.weight} lbs</p>
                <p className="text-sm text-muted-foreground">{formatCalendarDate(entry.date)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
