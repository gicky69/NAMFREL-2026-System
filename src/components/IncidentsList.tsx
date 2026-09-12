import { useState, useEffect, useCallback } from "react";
import { Search, Filter, MapPin, Calendar, User, FileText } from "lucide-react";
import type { Incident, IncidentType, Severity, IncidentStatus } from "@/types";
import { INCIDENT_TYPES, SEVERITY_LEVELS, INCIDENT_STATUSES } from "@/types";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/States";
import { SentimentBadge } from "@/components/SentimentBadge";
import { IncidentTypeBadge, SeverityBadge, StatusBadge } from "@/components/Badges";
import { formatDate } from "@/lib/sentiment";
import { auth } from "@/lib/firebase";

const API_URL = import.meta.env.VITE_API_URL;

export default function IncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<IncidentType | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "all">("all");
  const [provinceFilter, setProvinceFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const user = auth.currentUser;
    try {

      const token = await user?.getIdToken();

      const res = await fetch(`${API_URL}/api/incidents?status=verified`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        let detail= `Request failed with status ${res.status}`;
        try {
          const body = await res.json();
          if (body?.detail) detail = body.detail;
        } catch {

 
        }
        throw new Error(detail);
      }
      const data: Incident[] = await res.json();
      setIncidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message: "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]); 

  const provinces = [...new Set(incidents.map((i) => i.province))];

  const filteredIncidents = incidents.filter((incident) => {
    if (typeFilter !== "all" && incident.incident_type !== typeFilter) return false;
    if (severityFilter !== "all" && incident.severity !== severityFilter) return false;
    if (statusFilter !== "all" && incident.status !== statusFilter) return false;
    if (provinceFilter !== "all" && incident.province !== provinceFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches = [
        incident.title,
        incident.description,
        incident.province,
        incident.municipality,
        incident.reported_by,
      ].some((field) => field?.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return true;
  });

  if (loading) return <LoadingSpinner label="Loading incident reports..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Election Incident Reports</h2>
        <p className="text-sm text-slate-500 mt-1">
          Community-reported incidents across the BARMM region, classified by type and severity
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search incidents by title, description, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as IncidentType | "all")}
            className="input-field cursor-pointer text-sm"
          >
            <option value="all">All Types</option>
            {INCIDENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Severity | "all")}
            className="input-field cursor-pointer text-sm"
          >
            <option value="all">All Severities</option>
            {SEVERITY_LEVELS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | "all")}
            className="input-field cursor-pointer text-sm"
          >
            <option value="all">All Statuses</option>
            {INCIDENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="input-field cursor-pointer text-sm"
          >
            <option value="all">All Provinces</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <p className="text-sm text-slate-500">
          {filteredIncidents.length} of {incidents.length} incidents
        </p>
      </div>

      {/* Incidents list */}
      {filteredIncidents.length === 0 ? (
        <EmptyState
          title="No incidents found"
          message={incidents.length === 0 ? "No incident reports have been submitted yet." : "Try adjusting your filters or search query."}
        />
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className="card overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              <button
                onClick={() => setExpandedId(expandedId === incident.id ? null : incident.id)}
                className="w-full text-left p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 mb-2">{incident.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <IncidentTypeBadge type={incident.incident_type} />
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {incident.province}{incident.municipality ? `, ${incident.municipality}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(incident.incident_date)}
                      </span>
                    </div>
                  </div>
                  <SentimentBadge label={incident.sentiment_label} score={incident.sentiment_score} />
                </div>
              </button>

              {expandedId === incident.id && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 animate-fade-in">
                  <div className="flex items-start gap-2 mb-3">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-700 leading-relaxed">{incident.description}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100">
                    {incident.reported_by && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-400">Reported by</p>
                          <p className="text-sm text-slate-700">{incident.reported_by}</p>
                        </div>
                      </div>
                    )}
                    {incident.contact_info && (
                      <div>
                        <p className="text-xs text-slate-400">Contact</p>
                        <p className="text-sm text-slate-700">{incident.contact_info}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-400">Submitted</p>
                      <p className="text-sm text-slate-700">{formatDate(incident.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
