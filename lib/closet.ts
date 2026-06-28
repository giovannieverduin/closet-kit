// Closet status filtering for the mode row: Closet / Wishlist / Archived / All.
// "Archived" is a soft status (see bulkSetStatus) — items keep their page but are
// hidden from every view except the dedicated Archived one (and "All" excludes them).

export const ARCHIVED_STATUS = "Archived";

export const STATUS_MODES = ["Closet", "Wishlist", "Archived", "All"] as const;
export type StatusMode = (typeof STATUS_MODES)[number];

export function matchesStatusMode(status: string | null, mode: StatusMode): boolean {
  switch (mode) {
    case "Closet":
      return status === "Owns";
    case "Wishlist":
      return status === "Wishlist";
    case "Archived":
      return status === ARCHIVED_STATUS;
    case "All":
    default:
      // Everything still in rotation — archived pieces are tucked away.
      return status !== ARCHIVED_STATUS;
  }
}

// The status an item should take when the primary bulk action runs in a given
// view: archive from any normal view, restore (to the closet) from Archived.
export function bulkActionTarget(mode: StatusMode): { label: string; status: string } {
  return mode === "Archived"
    ? { label: "Restore to closet", status: "Owns" }
    : { label: "Archive", status: ARCHIVED_STATUS };
}
