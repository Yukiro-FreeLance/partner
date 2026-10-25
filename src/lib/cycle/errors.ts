export function isMissingCycleTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /cycle_/i.test(message) && /schema cache|does not exist|Could not find the table/i.test(message);
}

export function isMissingColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /column .* does not exist|Could not find the '.*' column/i.test(message);
}
