import type { SentimentLabel } from "@/types";
import { getSentimentBg, getSentimentIcon } from "@/lib/sentiment";

export function SentimentBadge({ label, score }: { label: SentimentLabel; score?: number }) {
  return (
    <span className={`badge ${getSentimentBg(label)}`}>
      <span className="text-[10px]">{getSentimentIcon(label)}</span>
      <span className="capitalize">{label}</span>
      {score !== undefined && (
        <span className="opacity-60">({score > 0 ? "+" : ""}{score})</span>
      )}
    </span>
  );
}
