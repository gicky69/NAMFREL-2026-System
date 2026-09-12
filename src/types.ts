export type SentimentLabel = "positive" | "negative" | "neutral";

export type Severity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "reported" | "verified" | "resolved";

export const ORGANIZATIONS = [
  "CCAA",
  "CSAT",
  "IAG",
  "NAMFREL",
  "NDBC",
  "NDU",
  "PPCRV",
] as const;
export type Organization = typeof ORGANIZATIONS[number];

export type IncidentType =
  | "violence"
  | "vote_buying"
  | "intimidation"
  | "fraud"
  | "infrastructure"
  | "displacement"
  | "other";

export interface UserProfile {
  id: string;
  firebase_uid: string;
  full_name: string | null;
  email: string | null;
  role: 'public' | 'personnel' | 'admin';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncidentCategory {
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  published_date: string | null;
  summary: string | null;
  sentiment_score: number;
  sentiment_label: SentimentLabel | null;
  sentiment_status: SentimentStatus;
  keywords: string[];
  province: string | null;
  scraped_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  incident_type: IncidentType;
  severity: Severity;
  province: string;
  municipality: string | null;
  incident_date: string;
  incident_time: string;
  reported_by: string | null;
  contact_info: string | null;
  status: IncidentStatus;
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  created_at: string;
  organization?: string;
}

export interface NewIncident {
  title: string;
  description: string;
  incident_type: IncidentType;
  severity: Severity;
  province: string;
  municipality?: string;
  incident_date: string;
  reported_by?: string;
  contact_info?: string;
  organization?: string;
  incident_hour?: string;
  incident_minute?: string;
  incident_period?: "AM" | "PM";
}

export const BARMM_PROVINCES = [
  "Basilan",
  "Lanao del Sur",
  "Maguindanao del Norte",
  "Maguindanao del Sur",
  "Sulu",
  "Tawi-Tawi",
] as const;

export const INCIDENT_TYPES: { value: IncidentType; label: string; color: string }[] = [
  { value: "violence", label: "Violence / Armed Conflict", color: "#dc2626" },
  { value: "vote_buying", label: "Vote Buying", color: "#ea580c" },
  { value: "intimidation", label: "Intimidation / Threats", color: "#d97706" },
  { value: "fraud", label: "Electoral Fraud", color: "#7c3aed" },
  { value: "infrastructure", label: "Infrastructure Issue", color: "#0891b2" },
  { value: "displacement", label: "Displacement / Evacuation", color: "#2563eb" },
  { value: "other", label: "Other", color: "#64748b" },
];

export const SEVERITY_LEVELS: { value: Severity; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "#16a34a" },
  { value: "medium", label: "Medium", color: "#ca8a04" },
  { value: "high", label: "High", color: "#ea580c" },
  { value: "critical", label: "Critical", color: "#dc2626" },
];

export const INCIDENT_STATUSES: { value: IncidentStatus; label: string; color: string }[] = [
  { value: "reported", label: "Reported", color: "#0891b2" },
  { value: "verified", label: "Verified", color: "#2563eb" },
  { value: "resolved", label: "Resolved", color: "#16a34a" },
];
