import { useEffect, useRef, useState } from "react";
import { Send, CheckCircle, FileWarning } from "lucide-react";
import { analyzeSentiment } from "@/lib/sentiment";
import type { NewIncident } from "@/types";
import { BARMM_PROVINCES, SEVERITY_LEVELS } from "@/types";

import { auth } from "@/lib/firebase";

const API_URL = import.meta.env.VITE_API_URL;

interface ReportIncidentProps {
  onSubmitted?: () => void;
}


export default function ReportIncident({ onSubmitted }: ReportIncidentProps) {
  const [formData, setFormData] = useState<NewIncident>({
    title: "",
    description: "",
    incident_type: "violence",
    severity: "medium",
    province: BARMM_PROVINCES[0],
    municipality: "",
    incident_date: new Date().toISOString().split("T")[0],
    reported_by: "",
    contact_info: "",
  });

  type IncidentCategory = {
    name: string;
    description: string | null;
  };
  const [incidentTypes, setIncidentTypes] = useState<IncidentCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);


  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveSentiment, setLiveSentiment] = useState<{ score: number; label: string } | null>(null);
  const sentimentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (field: keyof NewIncident, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({ ...prev, description: value }));

    if (sentimentTimerRef.current) {
      clearTimeout(sentimentTimerRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length > 10) {
      // Instant client-side preview first
      setLiveSentiment(analyzeSentiment(trimmed));

      // Debounced backend TagaSenti model inference
      if (API_URL) {
        sentimentTimerRef.current = setTimeout(async () => {
          try {
            const res = await fetch(`${API_URL}/api/sentiment/analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: trimmed }),
            });
            if (res.ok) {
              const data = await res.json();
              setLiveSentiment({ score: data.score, label: data.label });
            }
          } catch {
            // Retain local client-side estimate on error
          }
        }, 400);
      }
    } else {
      setLiveSentiment(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        incident_type: formData.incident_type,
        severity: formData.severity,
        province: formData.province,
        municipality: formData.municipality || null,
        incident_date: formData.incident_date,
        reported_by: formData.reported_by || null,
        contact_info: formData.contact_info || null,
        // sentiment_score / sentiment_label intentionally NOT sent -- the
        // backend computes those itself from `description` in
        // app/routers/incidents.py, so the frontend is never trusted for it.
      };

      const res = await fetch(`${API_URL}/api/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Submission failed (${res.status})`);
      }

      setSuccess(true);
      setFormData({
        title: "",
        description: "",
        incident_type: "violence",
        severity: "medium",
        province: BARMM_PROVINCES[0],
        municipality: "",
        incident_date: new Date().toISOString().split("T")[0],
        reported_by: "",
        contact_info: "",
      });
      setLiveSentiment(null);
      onSubmitted?.();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit incident report");
    } finally {
      setSubmitting(false);
    }
  };
  

  useEffect(() => {
    const fetchIncidentTypes = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          return;
        }

        const token = await user.getIdToken();

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/admin/categories`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch incident categories");
        }

        const data = await response.json();

        setIncidentTypes(data);
      } catch (error) {
        console.error("Error fetching incident types:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchIncidentTypes();
  }, []);
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Report an Election Incident</h2>
        <p className="text-sm text-slate-500 mt-1">
          Help monitor the BARMM election by reporting incidents you've witnessed or experienced
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="card p-5 border-green-200 bg-green-50 animate-fade-in flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">Incident report submitted successfully</p>
            <p className="text-sm text-green-600">Your report has been recorded and will appear in the incident reports list.</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50 animate-fade-in">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <FileWarning className="w-5 h-5 text-orange-600" />
          <h3 className="font-bold text-slate-900">Incident Details</h3>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Incident Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Brief title describing the incident"
            className="input-field"
            maxLength={200}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Describe what happened in detail. Include relevant facts, times, and context."
            className="input-field min-h-[120px] resize-y"
            maxLength={2000}
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-slate-400">{formData.description.length}/2000 characters</p>
            {liveSentiment && (
              <span className={`text-xs font-medium ${
                liveSentiment.label === "positive" ? "text-green-600" :
                liveSentiment.label === "negative" ? "text-red-600" : "text-slate-500"
              }`}>
                Live sentiment: {liveSentiment.label} ({liveSentiment.score > 0 ? "+" : ""}{liveSentiment.score})
              </span>
            )}
          </div>
        </div>

        {/* Incident Type & Severity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Incident Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.incident_type}
              onChange={(e) => handleChange("incident_type", e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="">
                {loadingCategories
                  ? "Loading incident types..."
                  : "Select Incident Type"}
              </option>

              {incidentTypes.map((type) => (
                <option key={type.name} value={type.name}>
                  {type.name}
                </option>
              ))}

    
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Severity <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITY_LEVELS.map((sev) => (
                <button
                  type="button"
                  key={sev.value}
                  onClick={() => handleChange("severity", sev.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
                    formData.severity === sev.value
                      ? "border-transparent text-white shadow-sm"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                  style={formData.severity === sev.value ? { backgroundColor: sev.color } : {}}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Province & Municipality */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Province <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.province}
              onChange={(e) => handleChange("province", e.target.value)}
              className="input-field cursor-pointer"
            >
              {BARMM_PROVINCES.map((prov) => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Municipality
            </label>
            <input
              type="text"
              value={formData.municipality}
              onChange={(e) => handleChange("municipality", e.target.value)}
              placeholder="e.g. Marawi City"
              className="input-field"
            />
          </div>
        </div>

        {/* Incident Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Date of Incident <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.incident_date}
            onChange={(e) => handleChange("incident_date", e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="input-field"
          />
        </div>

        {/* Reporter info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Your Name (optional)
            </label>
            <input
              type="text"
              value={formData.reported_by}
              onChange={(e) => handleChange("reported_by", e.target.value)}
              placeholder="Anonymous if left blank"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Contact Info (optional)
            </label>
            <input
              type="text"
              value={formData.contact_info}
              onChange={(e) => handleChange("contact_info", e.target.value)}
              placeholder="Phone or email for follow-up"
              className="input-field"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={submitting || !formData.title || !formData.description}
            className="btn-primary w-full sm:w-auto flex items-center gap-2 justify-center"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Submitting..." : "Submit Incident Report"}
          </button>
        </div>
      </form>
    </div>
  );
}