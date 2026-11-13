import { History } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { listSessions } from "@/lib/sessions/store";

// Always reflects the current history; never worth prerendering/caching for a single user.
export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const sessions = await listSessions();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">History</h1>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground">
          No workout sessions logged yet. Start one from the Exercises or Templates tab.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <Card size="sm" className="transition-colors hover:bg-accent">
                <CardContent className="flex items-start gap-3">
                  <History className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{session.templateName ?? "Ad-hoc Session"}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.startedAt.toLocaleString()}
                      {session.exerciseNames.length > 0 && ` · ${session.exerciseNames.join(", ")}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
