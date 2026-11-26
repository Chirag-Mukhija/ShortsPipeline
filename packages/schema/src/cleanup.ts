// The cleanup plan for a finished video: which rough files can go, how much space each group frees, and what stops or should worry the creator.
export const CLEANUP_GROUPS = ["takes", "clips", "drafts", "stills", "logs", "footage", "masters"] as const;
export type CleanupGroupId = (typeof CLEANUP_GROUPS)[number];

export type CleanupGroup = {
  id: CleanupGroupId;
  label: string;
  // What losing it means, in one line.
  detail: string;
  // False when the studio can make these files again from what stays.
  permanent: boolean;
  // Ticked when the creator opens the list. Sources the final could be re-rendered from start unticked.
  selected: boolean;
  files: number;
  bytes: number;
  examples: string[];
};

export type CleanupPlan = {
  final: { path: string; bytes: number; seconds: number } | null;
  groups: CleanupGroup[];
  // Reasons nothing can be deleted yet, and things to know first.
  blockers: string[];
  warnings: string[];
  // Identifies exactly the files listed; deleting needs the same one back, so nothing unseen is ever deleted.
  signature: string;
};

export type CleanupResult = { freed: number; deleted: number; failed: string[]; plan: CleanupPlan };
