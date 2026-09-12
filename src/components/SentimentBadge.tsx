import type { SentimentLabel } from "@/types";
import { getSentimentBg, getSentimentIcon } from "@/lib/sentiment";

export function SentimentBadge({ label, score }: { label: SentimentLabel | null | undefined; score?: number }) {
  if (!label) return null; // nothing to show yet -- caller should render SentimentStatusBadge instead

  return (
    <span className={`badge ${getSentimentBg(label)}`}>
      <span className="text-[10px]">{getSentimentIcon(label)}</span>
      <span className="capitalize">{label}</span>
      {score !== undefined && score !== null && (
        <span className="opacity-60">({score > 0 ? "+" : ""}{score})</span>
      )}
    </span>
  );
}