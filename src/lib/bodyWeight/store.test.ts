import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { listBodyWeightEntries, logBodyWeight } from "./store";

// Unique weight values act as the test's identity tag, since BodyWeightEntry has no name field.
const TAG = Number(`${process.pid}`.slice(-3)) / 1000;

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.bodyWeightEntry.deleteMany({ where: { weight: { gte: 900, lt: 901 } } });
});

describe("logBodyWeight", () => {
  it("saves a Body Weight entry for the given date and weight", async () => {
    const date = new Date("2026-01-15T00:00:00.000Z");

    const result = await logBodyWeight({ date, weight: 900 + TAG });

    expect(result.ok).toBe(true);
    const saved = await prisma.bodyWeightEntry.findFirstOrThrow({ where: { weight: 900 + TAG } });
    expect(saved.date.toISOString()).toBe(date.toISOString());
  });

  it("rejects a non-positive weight", async () => {
    const result = await logBodyWeight({ date: new Date(), weight: 0 });
    expect(result.ok).toBe(false);
  });
});

describe("listBodyWeightEntries", () => {
  it("lists entries ordered by date", async () => {
    await logBodyWeight({ date: new Date("2026-02-01T00:00:00.000Z"), weight: 900 + TAG });
    await logBodyWeight({ date: new Date("2026-01-01T00:00:00.000Z"), weight: 900 + TAG + 0.001 });

    const list = await listBodyWeightEntries();
    const ours = list.filter((e) => e.weight >= 900 && e.weight < 901);
    expect(ours.map((e) => e.date.toISOString())).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-02-01T00:00:00.000Z",
    ]);
  });
});
