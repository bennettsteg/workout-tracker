import { notFound } from "next/navigation";

import { SessionLogger } from "@/components/sessions/SessionLogger";
import { listExercises } from "@/lib/exercises/store";
import { getSessionDetail } from "@/lib/sessions/store";

// Live logging target; never worth prerendering/caching for a single user.
export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, exercises] = await Promise.all([getSessionDetail(id), listExercises()]);
  if (!session) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl">{session.templateName ?? "Ad-hoc Session"}</h1>
        <p className="text-sm text-muted-foreground">{session.startedAt.toLocaleString()}</p>
      </div>
      <SessionLogger session={session} exercises={exercises.map((e) => ({ id: e.id, name: e.name }))} />
    </div>
  );
}
