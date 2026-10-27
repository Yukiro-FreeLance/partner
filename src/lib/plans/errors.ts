export function isMissingPlanTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /date_plans|itinerary_/i.test(message) && /schema cache|does not exist|Could not find the table/i.test(message);
}
