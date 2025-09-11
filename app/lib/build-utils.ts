"use client";

// Department keys, including combined QC row for the bottom
export const DEPT_ORDER: readonly string[] = [
  "lamination",
  "assembly",
  "finishing",
  "rigging",
  "qc", // use this for "QC/Sea Trial/Detail/Delivery" combined row
];

// Fiberglass 5 statuses (canonical)
export type FGStatus = "not_scheduled"|"scheduled"|"in_mold"|"out_of_mold"|"finished";

// Weight used to compute dept progress %
export const FG_STATUS_WEIGHT: Record<FGStatus, number> = {
  not_scheduled: 0,
  scheduled: 10,
  in_mold: 50,
  out_of_mold: 80,
  finished: 100,
};

// Map display label
export const FG_STATUS_LABEL: Record<FGStatus, string> = {
  not_scheduled: "Not Scheduled",
  scheduled: "Scheduled",
  in_mold: "In Mold",
  out_of_mold: "Out of Mold",
  finished: "Finished",
};

// Issue icons mapping
export const ISSUE_ICONS = {
  missing: "🛑",    // Missing parts
  gelcoat: "🎨",    // Gelcoat issues
  other:   "⏳",    // Other delays
};

// Compute fiberglass department % from a list of fiberglass lines with status
export function computeFiberglassPercent(lines: { status: FGStatus }[]): number {
  if (!lines?.length) return 0;
  const total = lines.length;
  const sum = lines.reduce((acc, l) => acc + (FG_STATUS_WEIGHT[l.status] ?? 0), 0);
  return Math.round(sum / total);
}

// Tiny overall % fallback when we only have fiberglass
export function computeOverallPercentFromFiberglass(allFg: { status: FGStatus }[]): number {
  return computeFiberglassPercent(allFg);
}

// Normalize a boat color (hex or name). Return bg/text class hints and raw color if available.
export function getBoatColorHex(input?: string): string | null {
  if (!input) return null;
  // basic guard; assume valid CSS color or hex
  return input;
}