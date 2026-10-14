export type ReviewTier =
  'none' | 'potentially-related' | 'needs-verification' | 'strong-duplicate-evidence';
export const TIER_LABELS: Record<ReviewTier, string> = {
  none: 'No related evidence',
  'potentially-related': 'Potentially related',
  'needs-verification': 'Needs verification',
  'strong-duplicate-evidence': 'Strong duplicate evidence',
};
