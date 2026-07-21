export function normalizeSnapshotLine(value, options = {}) {
  const text = String(value ?? "").trim();
  if (!options.stripOrdinalNavigation) {
    return text;
  }

  return text.replace(/,\s*\d+\s+of\s+\d+\s*$/i, "").trim();
}