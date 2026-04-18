import type { ReviewCategory } from '../types/chess';

interface ReviewBadgeProps {
  category: ReviewCategory;
  label: string;
}

export function ReviewBadge({ category, label }: ReviewBadgeProps) {
  return <span className={`review-badge review-badge--${category}`}>{label}</span>;
}
