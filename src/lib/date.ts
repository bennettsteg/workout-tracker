/**
 * Formats a pure calendar date (no meaningful time-of-day, e.g. BodyWeightEntry.date) using the
 * UTC calendar fields it was stored with. `Date#toLocaleDateString()` converts through the
 * browser's local timezone first, which can shift a date like "2026-11-01" to "10/31/2026" for
 * anyone west of UTC - this renders the same date that was entered, everywhere.
 */
export function formatCalendarDate(date: Date): string {
  return date.toLocaleDateString(undefined, { timeZone: "UTC" });
}

/**
 * Formats a real instant (e.g. WorkoutSession.startedAt) as a calendar date in the viewer's own
 * timezone - the opposite of formatCalendarDate, which is for values with no time-of-day.
 * Converting through the local timezone is exactly the right behavior here: a session logged
 * late at night should show as that night's date, not UTC's.
 */
export function formatInstantDate(date: Date): string {
  return date.toLocaleDateString();
}
