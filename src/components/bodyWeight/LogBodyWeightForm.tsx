"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logBodyWeight } from "@/server-actions/body-weight-actions";

/** The user's local calendar date, not UTC's - toISOString() would default the picker to
 * tomorrow for part of the evening in any timezone west of UTC. */
function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function LogBodyWeightForm() {
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await logBodyWeight({ date: new Date(date), weight: Number(weight) });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setWeight("");
      setError(null);
      router.refresh();
    });
  }

  return (
    <Card size="sm">
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bw-date">Date</Label>
            <Input id="bw-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bw-weight">Weight (lbs)</Label>
            <Input
              id="bw-weight"
              type="number"
              min={0}
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-28"
              required
            />
          </div>
          <Button type="submit" disabled={pending}>
            Log Weight
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
