export type ElectionRegion = "barmm" | "batanes";

export type SentimentLabel = "positive" | "negative" | "neutral";
export type SentimentStatus = "pending" | "processing" | "done" | "failed";

export type Severity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "reported" | "verified" | "resolved";
export type ArticleStatus = "pending" | "verified" | "rejected";

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
  role: 'public' | 'personnel' | 'admin' | 'super_admin' | 'display';
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
  status: ArticleStatus;
  keywords: string[];
  province: string | null;
  region?: ElectionRegion;
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
  region?: ElectionRegion;
  incident_date: string;
  incident_time: string;
  reported_by: string | null;
  contact_info: string | null;
  status: IncidentStatus;
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  created_at: string;
  organization?: string;
  category?: string;
  reporter_latitude?: number | null;
  reporter_longitude?: number | null;
  reporter_location_accuracy?: number | null;
  reporter_ip?: string | null;
}

export interface NewIncident {
  title: string;
  description: string;
  incident_type: IncidentType | "";
  severity: Severity | "";
  province: string;
  municipality?: string;
  region?: ElectionRegion;
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
  "Cotabato City (ICC)"
] as const;

export const BATANES_MUNICIPALITIES = [
  "Basco",
  "Itbayat",
  "Ivana",
  "Mahatao",
  "Sabtang",
  "Uyugan",
] as const;

export interface RegionConfig {
  id: ElectionRegion;
  label: string;
  shortLabel: string;
  subtitle: string;
  provinces: readonly string[];
  municipalities?: readonly string[];
  mapCenter: [number, number];
  mapZoom: number;
  unitLabel: string;
}

export const REGION_CONFIG: Record<ElectionRegion, RegionConfig> = {
  barmm: {
    id: "barmm",
    label: "BARMM Parliamentary Elections 2026",
    shortLabel: "BARMM",
    subtitle: "Bangsamoro Autonomous Region in Muslim Mindanao",
    provinces: BARMM_PROVINCES,
    mapCenter: [6.6, 122.2],
    mapZoom: 7,
    unitLabel: "Province",
  },
  batanes: {
    id: "batanes",
    label: "Batanes Elections 2026",
    shortLabel: "Batanes",
    subtitle: "Province of Batanes (Region II)",
    provinces: ["Batanes"],
    municipalities: BATANES_MUNICIPALITIES,
    mapCenter: [20.52, 121.92],
    mapZoom: 10,
    unitLabel: "Municipality",
  },
};

export function inferRegionFromProvince(province?: string | null): ElectionRegion {
  return province?.trim().toLowerCase() === "batanes" ? "batanes" : "barmm";
}

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
