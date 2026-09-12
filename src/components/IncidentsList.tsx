import { useState, useEffect, useCallback } from "react";
import { Search, Filter, MapPin, Calendar, User, FileText } from "lucide-react";
import type { Incident, IncidentType, Severity, IncidentStatus } from "@/types";
import { INCIDENT_TYPES, SEVERITY_LEVELS, INCIDENT_STATUSES } from "@/types";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/States";
import { SentimentBadge } from "@/components/SentimentBadge";
import { IncidentTypeBadge, SeverityBadge, StatusBadge } from "@/components/Badges";
import { formatDate } from "@/lib/sentiment";

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

  const formatTime = (time: string | null | undefined) => {
    if (!time) return "";

    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes));

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleDownloadPDF = async (incidentId: string) => {
    const { jsPDF } = await import("jspdf");

    const incident = incidents.find((i) => i.id === incidentId);
    if (!incident) return;

    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 22;
    const contentWidth = pageWidth - margin * 2;

    let y = 25;

    // =========================
    // HELPERS
    // =========================

    const checkPage = (neededSpace = 20) => {
      if (y + neededSpace > pageHeight - 25) {
        doc.addPage();
        y = 25;
      }
    };

    const addDivider = () => {
      checkPage(8);

      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.3);

      doc.line(margin, y, pageWidth - margin, y);

      y += 10;
    };

    const addSectionTitle = (title: string) => {
      checkPage(15);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);

      doc.text(title, margin, y);

      y += 9;
    };

    const addField = (
      label: string,
      value: string | number | null | undefined
    ) => {
      checkPage(20);

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);

      doc.text(label.toUpperCase(), margin, y);

      y += 6;

      // Value
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);

      const text =
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
          ? String(value)
          : "—";

      const wrappedText = doc.splitTextToSize(
        text,
        contentWidth
      );

      doc.text(wrappedText, margin, y);

      y += wrappedText.length * 5.5 + 7;
    };

    // =========================
    // TITLE
    // =========================

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(30, 30, 30);

    const titleLines = doc.splitTextToSize(
      incident.title || "Untitled Incident",
      contentWidth
    );

    doc.text(titleLines, margin, y);

    y += titleLines.length * 10 + 5;

    // Small metadata
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);

    doc.text(
      `Incident Report • ID: ${incident.id}`,
      margin,
      y
    );

    y += 12;

    addDivider();

    // =========================
    // OVERVIEW
    // =========================

    addSectionTitle("Overview");

    addField(
      "Date & Time",
      `${formatDate(incident.incident_date)} at ${formatTime(
        incident.incident_time
      )}`
    );

    addField("Incident Type", incident.incident_type);

    addField("Severity", incident.severity);

    addField("Status", incident.status);

    addDivider();

    // =========================
    // LOCATION
    // =========================

    addSectionTitle("Location");

    addField("Province", incident.province);

    addField(
      "Municipality",
      incident.municipality || "Not specified"
    );

    addDivider();

    // =========================
    // DESCRIPTION
    // =========================

    addSectionTitle("Description");

    addField(
      "Incident Details",
      incident.description
    );

    addDivider();

    // =========================
    // REPORTER
    // =========================

    addSectionTitle("Reporter Information");

    addField(
      "Reported By",
      incident.reported_by || "Anonymous"
    );

    addField(
      "Contact Information",
      incident.contact_info || "Not provided"
    );

    addField("Approximate Location (Latitude, Longitude)",
      incident.reporter_latitude && incident.reporter_longitude
        ? `${incident.reporter_latitude.toFixed(6)}, ${incident.reporter_longitude.toFixed(6)}`
        : "Not provided"
    )

    addDivider();

    // =========================
    // SENTIMENT ANALYSIS
    // =========================

    addSectionTitle("Sentiment Analysis");

    addField(
      "Sentiment",
      incident.sentiment_label
    );

    addField(
      "Sentiment Score",
      incident.sentiment_score
    );

    // =========================
    // FOOTER
    // =========================

    const totalPages = doc.getNumberOfPages();

    for (let page = 1; page <= totalPages; page++) {
      doc.setPage(page);

      doc.setDrawColor(230, 230, 230);
      doc.line(
        margin,
        pageHeight - 18,
        pageWidth - margin,
        pageHeight - 18
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);

      doc.text(
        "Incident Reporting System",
        margin,
        pageHeight - 11
      );

      doc.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 11,
        { align: "right" }
      );
    }

    doc.save(`incident_${incident.id}.pdf`);
  };

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/incidents?status=verified`);
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
      console.log("Fetched incidents:", data);  
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
        incident.reported_by
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
                      <p className="text-xs text-slate-400">Incident Date</p>
                      <p className="text-sm text-slate-700">
                        {formatDate(
                          `${incident.incident_date}`
                        )} at {formatTime(incident.incident_time)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Submitted</p>
                      <p className="text-sm text-slate-700">{formatDate(incident.created_at)}</p>
                    </div>
                  </div>

                  <button 
                    className="text-sm mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                    onClick={() => handleDownloadPDF(incident.id)}
                  >
                      Download as PDF
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
