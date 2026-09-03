import type { SentimentLabel } from "@/types";

const POSITIVE_WORDS = [
  "peaceful", "peace", "success", "successful", "progress",
  "support", "hope", "unity", "agreement", "agreed", "cooperation",
  "transparent", "fair", "orderly", "celebrated", "landslide", "victory",
  "win", "triumph", "confidence", "optimism", "endorsed", "respected",
  "reform", "improved", "benefit", "democratic", "legitimate", "turnout",
];

const NEGATIVE_WORDS = [
  "violence", "kill", "killed", "attack", "attacked", "bomb", "bombing",
  "fraud", "cheating", "intimidation", "threat", "threatened", "gunman",
  "shooting", "shot", "explosion", "explosive", "grenade", "ambush",
  "clash", "clashes", "evacuate", "evacuated", "displace", "displaced",
  "corrupt", "corruption", "vote buying", "vote-buying", "rigging",
  "protest", "rally", "unrest", "tension", "tensions", "conflict",
  "fear", "fearful", "dangerous", "boycott", "dispute",
  "massacre", "behead", "hostage", "kidnap", "abduction", "terror",
  "fire", "burned", "arson", "looted", "looting",
];

export function analyzeSentiment(text: string): { score: number; label: SentimentLabel } {
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,.;:!?'"\-—–()]+|/).filter(Boolean);
  let positive = 0;
  let negative = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.some((p) => word.includes(p) || p.includes(word))) {
      positive++;
    }
    if (NEGATIVE_WORDS.some((n) => word.includes(n) || n.includes(word))) {
      negative++;
    }
  }

  if (lower.includes("vote buying") || lower.includes("vote-buying")) negative++;

  const total = positive + negative;
  if (total === 0) return { score: 0, label: "neutral" };

  const score = (positive - negative) / total;
  let label: SentimentLabel = "neutral";
  if (score > 0.15) label = "positive";
  else if (score < -0.15) label = "negative";

  return { score: Math.round(score * 100) / 100, label };
}

export function getSentimentColor(label: SentimentLabel): string {
  switch (label) {
    case "positive":
      return "#16a34a";
    case "negative":
      return "#dc2626";
    case "neutral":
      return "#64748b";
  }
}

export function getSentimentBg(label: SentimentLabel): string {
  switch (label) {
    case "positive":
      return "bg-green-100 text-green-700 border-green-200";
    case "negative":
      return "bg-red-100 text-red-700 border-red-200";
    case "neutral":
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export function getSentimentIcon(label: SentimentLabel): string {
  switch (label) {
    case "positive":
      return "▲";
    case "negative":
      return "▼";
    case "neutral":
      return "●";
  }
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
