// src/components/SentimentStatusBadge.tsx
import { Loader2, AlertCircle, Clock } from "lucide-react";
import type { SentimentStatus } from "@/types";

const STATUS_CONFIG: Record<SentimentStatus, { label: string; className: string; icon?: React.ElementType }> = {
  pending: { label: "Queued", className: "bg-slate-100 text-slate-500", icon: Clock },
  processing: { label: "Analyzing…", className: "bg-blue-50 text-blue-600", icon: Loader2 },
  done: { label: "Analyzed", className: "bg-teal-50 text-teal-600" },
  failed: { label: "Analysis failed", className: "bg-red-50 text-red-600", icon: AlertCircle },
};

export function SentimentStatusBadge({ status }: { status: SentimentStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${config.className}`}>
      {Icon && <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />}
      {config.label}
    </span>
  );
}