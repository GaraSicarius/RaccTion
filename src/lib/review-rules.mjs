// Demo display thresholds, not calibrated scam probabilities.
export function deriveReviewStatus(warnings, hasCoverageGap) {
  if (!Number.isInteger(warnings) || warnings < 0) {
    throw new RangeError('Warning count must be a non-negative integer.');
  }
  if (hasCoverageGap) return 'unknown';
  if (warnings === 0) return 'clear';
  return warnings >= 2 ? 'high' : 'warning';
}

export function reorderSections(priority) {
  const sections = ['conditions', 'costs', 'steps', 'dates', 'eligibility'];
  const selected = String(priority).toLowerCase().replace(/ first$/, '');
  if (!sections.includes(selected)) return sections;
  return [selected, ...sections.filter((section) => section !== selected)];
}
